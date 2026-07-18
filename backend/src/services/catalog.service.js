import pool from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../config/constant.js';
import { MESSAGES } from '../config/messages.js';
import fs from 'fs';
import path from 'path';

const deleteFile = (filePath) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

export const catalogService = {
  async createCategory({ name, description }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const existing = await client.query('SELECT id FROM categories WHERE name = $1', [name.trim()]);
      if (existing.rows.length > 0) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CATALOG.CATEGORY_ALREADY_EXISTS, 'CATEGORY_ALREADY_EXISTS');
      }
      const result = await client.query(
        'INSERT INTO categories (name, description) VALUES ($1, $2) RETURNING id, name, description, created_at',
        [name.trim(), description?.trim() || null]
      );
      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getCategories() {
    const result = await pool.query(
      'SELECT id, name FROM categories WHERE is_deleted = false ORDER BY name'
    );
    return result.rows;
  },

  async getCategoryById(id) {
    const result = await pool.query(
      'SELECT id, name FROM categories WHERE id = $1 AND is_deleted = false',
      [id]
    );
    return result.rows[0] || null;
  },

  async createProduct(vendorUserId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cat = await client.query('SELECT id FROM categories WHERE id = $1 AND is_deleted = false', [data.categoryId]);
      if (cat.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.CATALOG.CATEGORY_NOT_FOUND, 'CATEGORY_NOT_FOUND');
      }

      const existing = await client.query(
        `SELECT id FROM products 
         WHERE vendor_user_id = $1 AND category_id = $2 AND LOWER(TRIM(name)) = LOWER(TRIM($3)) AND is_deleted = false`,
        [vendorUserId, data.categoryId, data.name]
      );
      if (existing.rows.length > 0) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CATALOG.PRODUCT_ALREADY_EXISTS, 'PRODUCT_ALREADY_EXISTS');
      }

      const productResult = await client.query(
        `INSERT INTO products (vendor_user_id, category_id, name, description, brand, manufacturer, thumbnail, images)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id, vendor_user_id, category_id, name, description, brand, manufacturer, thumbnail, images, status, created_at, updated_at`,
        [vendorUserId, data.categoryId, data.name.trim(), data.description?.trim() || null, 
         data.brand?.trim() || null, data.manufacturer?.trim() || null, data.thumbnailUrl || null, JSON.stringify(data.images || [])]
      );
      const product = productResult.rows[0];

      await client.query(
        'INSERT INTO inventory (product_id, available, reserved, rented, maintenance) VALUES ($1, 0, 0, 0, 0)',
        [product.id]
      );

      await client.query('COMMIT');

      const catResult = await pool.query('SELECT id, name FROM categories WHERE id = $1', [product.category_id]);
      return { ...product, category: catResult.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      if (data.thumbnailUrl) deleteFile(data.thumbnailUrl);
      if (data.images?.length) data.images.forEach(deleteFile);
      throw err;
    } finally {
      client.release();
    }
  },

  async createProductWithFiles(vendorUserId, data, thumbnailFile, galleryFiles) {
    const thumbnailUrl = thumbnailFile ? `/uploads/products/thumbnails/${thumbnailFile.filename}` : null;
    const galleryUrls = galleryFiles?.map(f => `/uploads/products/gallery/${f.filename}`) || [];
    
    return this.createProduct(vendorUserId, {
      ...data,
      thumbnailUrl,
      images: galleryUrls,
    });
  },

  async updateProductWithFiles(vendorUserId, productId, data, thumbnailFile, galleryFiles) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id, category_id, thumbnail, images FROM products WHERE id = $1 AND vendor_user_id = $2 AND is_deleted = false',
        [productId, vendorUserId]
      );
      if (existing.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.CATALOG.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }
      const currentProduct = existing.rows[0];

      if (data.categoryId && data.categoryId !== currentProduct.category_id) {
        const cat = await client.query('SELECT id FROM categories WHERE id = $1 AND is_deleted = false', [data.categoryId]);
        if (cat.rows.length === 0) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.CATALOG.CATEGORY_NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }
      }

      if (data.name) {
        const dup = await client.query(
          `SELECT id FROM products 
           WHERE vendor_user_id = $1 AND category_id = $2 AND LOWER(TRIM(name)) = LOWER(TRIM($3)) AND id != $4 AND is_deleted = false`,
          [vendorUserId, data.categoryId || currentProduct.category_id, data.name, productId]
        );
        if (dup.rows.length > 0) {
          throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CATALOG.PRODUCT_ALREADY_EXISTS, 'PRODUCT_ALREADY_EXISTS');
        }
      }

      const thumbnailUrl = thumbnailFile ? `/uploads/products/thumbnails/${thumbnailFile.filename}` : (data.thumbnail !== undefined ? data.thumbnail : currentProduct.thumbnail);
      const images = galleryFiles?.length > 0 
        ? galleryFiles.map(f => `/uploads/products/gallery/${f.filename}`)
        : (data.images !== undefined ? data.images : (currentProduct.images || []));

      const updates = [];
      const values = [productId];
      let idx = 2;
      const fields = ['categoryId', 'name', 'description', 'brand', 'manufacturer', 'status'];
      for (const field of fields) {
        if (data[field] !== undefined) {
          const col = field === 'categoryId' ? 'category_id' : field;
          updates.push(`${col} = $${idx}`);
          values.push(data[field]);
          idx++;
        }
      }
      if (thumbnailUrl !== currentProduct.thumbnail) {
        updates.push(`thumbnail = $${idx}`);
        values.push(thumbnailUrl);
        idx++;
      }
      if (JSON.stringify(images) !== JSON.stringify(currentProduct.images || [])) {
        updates.push(`images = $${idx}`);
        values.push(JSON.stringify(images));
        idx++;
      }
      if (updates.length === 0 && !thumbnailFile && (!galleryFiles || galleryFiles.length === 0)) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No fields to update');
      }
      updates.push('updated_at = NOW()');

      const result = await client.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = $1 RETURNING id, name, category_id, brand, manufacturer, status, thumbnail, images, created_at`,
        values
      );

      await client.query('COMMIT');

      if (thumbnailFile && currentProduct.thumbnail) {
        deleteFile(currentProduct.thumbnail);
      }
      if (galleryFiles?.length > 0 && currentProduct.images?.length) {
        currentProduct.images.forEach(deleteFile);
      }

      const catResult = await pool.query('SELECT id, name FROM categories WHERE id = $1', [result.rows[0].category_id]);
      return { ...result.rows[0], category: catResult.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      if (thumbnailFile) deleteFile(`/uploads/products/thumbnails/${thumbnailFile.filename}`);
      if (galleryFiles?.length) galleryFiles.forEach(f => deleteFile(`/uploads/products/gallery/${f.filename}`));
      throw err;
    } finally {
      client.release();
    }
  },

  async listProducts(query) {
    const { page = 1, limit = 10, search, category, brand, sort = 'name', order = 'asc' } = query;
    const offset = (page - 1) * limit;
    
    let whereClause = 'WHERE p.is_deleted = false AND p.status = \'ACTIVE\'';
    const params = [];
    let paramIndex = 1;

    if (search) {
      whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (category) {
      whereClause += ` AND p.category_id = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }
    if (brand) {
      whereClause += ` AND p.brand ILIKE $${paramIndex}`;
      params.push(`%${brand}%`);
      paramIndex++;
    }

    const validSortColumns = { name: 'p.name', createdAt: 'p.created_at', startingPrice: 'starting_price' };
    const sortColumn = validSortColumns[sort] || 'p.name';
    const sortOrder = order.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM products p ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const productsResult = await pool.query(
      `SELECT p.id, p.name, p.thumbnail, p.brand, p.vendor_user_id as "vendorId",
              c.id as "categoryId", c.name as "categoryName",
              COALESCE(i.available, 0) as available,
              (SELECT MIN(pp.price) FROM product_pricing pp WHERE pp.product_id = p.id) as "startingPrice",
              p.status, p.created_at as "createdAt"
       FROM products p
       JOIN categories c ON p.category_id = c.id
       LEFT JOIN inventory i ON p.id = i.product_id
       ${whereClause}
       ORDER BY ${sortColumn} ${sortOrder}
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    const vendorIds = [...new Set(productsResult.rows.map(p => p.vendorId))];
    let vendorNames = {};
    if (vendorIds.length > 0) {
      const vendorResult = await pool.query(
        `SELECT u.id, vp.company_name as "companyName" 
         FROM users u JOIN vendor_profiles vp ON u.id = vp.user_id 
         WHERE u.id = ANY($1)`,
        [vendorIds]
      );
      vendorNames = Object.fromEntries(vendorResult.rows.map(v => [v.id, v.companyName]));
    }

    const data = productsResult.rows.map(p => ({
      id: p.id,
      name: p.name,
      thumbnail: p.thumbnail,
      category: { id: p.categoryId, name: p.categoryName },
      brand: p.brand,
      vendorId: p.vendorId,
      vendorName: vendorNames[p.vendorId] || '',
      inventory: { available: p.available },
      startingPrice: p.startingPrice,
      status: p.status,
      createdAt: p.createdAt,
    }));

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  },

  async getProductById(id) {
    const productResult = await pool.query(
      `SELECT p.*, c.id as "categoryId", c.name as "categoryName"
       FROM products p
       JOIN categories c ON p.category_id = c.id
       WHERE p.id = $1 AND p.is_deleted = false`,
      [id]
    );
    if (productResult.rows.length === 0) return null;
    const product = productResult.rows[0];

    const vendorResult = await pool.query(
      `SELECT u.id, vp.company_name as "companyName"
       FROM users u JOIN vendor_profiles vp ON u.id = vp.user_id
       WHERE u.id = $1`,
      [product.vendor_user_id]
    );
    const vendor = vendorResult.rows[0] || { id: product.vendor_user_id, companyName: '' };

    const invResult = await pool.query(
      'SELECT available, reserved, rented, maintenance FROM inventory WHERE product_id = $1',
      [id]
    );
    const inventory = invResult.rows[0] || { available: 0, reserved: 0, rented: 0, maintenance: 0 };

    const pricingResult = await pool.query(
      `SELECT id, period, duration, price, deposit FROM product_pricing WHERE product_id = $1 ORDER BY period, duration`,
      [id]
    );

    const lateFeeResult = await pool.query(
      'SELECT grace_period_hours as "gracePeriodHours", rate_type as "rateType", rate_amount as "rateAmount", max_cap as "maxCap" FROM late_fee_rules WHERE vendor_user_id = $1',
      [product.vendor_user_id]
    );

    const cancelResult = await pool.query(
      'SELECT full_refund_hours_before as "fullRefundHoursBefore", partial_refund_hours_before as "partialRefundHoursBefore", partial_refund_percent as "partialRefundPercent" FROM cancellation_policies WHERE vendor_user_id = $1',
      [product.vendor_user_id]
    );

    // Parse images from JSON
    let images = [];
    try {
      images = product.images || [];
    } catch (e) {
      images = [];
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      brand: product.brand,
      manufacturer: product.manufacturer,
      thumbnail: product.thumbnail,
      category: { id: product.categoryId, name: product.categoryName },
      vendor: { id: vendor.id, companyName: vendor.companyName },
      images: images,
      inventory: {
        available: inventory.available,
        reserved: inventory.reserved,
        rented: inventory.rented,
        maintenance: inventory.maintenance,
      },
      pricing: pricingResult.rows.map(p => ({
        id: p.id,
        period: p.period,
        duration: p.duration,
        price: p.price,
        deposit: p.deposit,
      })),
      lateFeeRule: lateFeeResult.rows[0] || null,
      cancellationPolicy: cancelResult.rows[0] || null,
    };
  },

  async updateProduct(vendorUserId, productId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const existing = await client.query(
        'SELECT id, category_id FROM products WHERE id = $1 AND vendor_user_id = $2 AND is_deleted = false',
        [productId, vendorUserId]
      );
      if (existing.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.CATALOG.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      if (data.categoryId && data.categoryId !== existing.rows[0].category_id) {
        const cat = await client.query('SELECT id FROM categories WHERE id = $1 AND is_deleted = false', [data.categoryId]);
        if (cat.rows.length === 0) {
          throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.CATALOG.CATEGORY_NOT_FOUND, 'CATEGORY_NOT_FOUND');
        }
      }

      if (data.name) {
        const dup = await client.query(
          `SELECT id FROM products 
           WHERE vendor_user_id = $1 AND category_id = $2 AND LOWER(TRIM(name)) = LOWER(TRIM($3)) AND id != $4 AND is_deleted = false`,
          [vendorUserId, data.categoryId || existing.rows[0].category_id, data.name, productId]
        );
        if (dup.rows.length > 0) {
          throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CATALOG.PRODUCT_ALREADY_EXISTS, 'PRODUCT_ALREADY_EXISTS');
        }
      }

      const updates = [];
      const values = [productId];
      let idx = 2;
      const fields = ['categoryId', 'name', 'description', 'brand', 'manufacturer', 'thumbnail', 'images', 'status'];
      for (const field of fields) {
        if (data[field] !== undefined) {
          const col = field === 'categoryId' ? 'category_id' : field;
          updates.push(`${col} = $${idx}`);
          values.push(field === 'images' ? JSON.stringify(data[field]) : data[field]);
          idx++;
        }
      }
      if (updates.length === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No fields to update');
      }
      updates.push('updated_at = NOW()');

      const result = await client.query(
        `UPDATE products SET ${updates.join(', ')} WHERE id = $1 RETURNING id, name, category_id, brand, manufacturer, status, thumbnail, created_at`,
        values
      );

      await client.query('COMMIT');

      const catResult = await pool.query('SELECT id, name FROM categories WHERE id = $1', [result.rows[0].category_id]);
      return { ...result.rows[0], category: catResult.rows[0] };
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deleteProduct(vendorUserId, productId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const product = await client.query(
        'SELECT id, status FROM products WHERE id = $1 AND vendor_user_id = $2 AND is_deleted = false',
        [productId, vendorUserId]
      );
      if (product.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.CATALOG.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      const activeOrders = await client.query(
        `SELECT id FROM orders 
         WHERE product_id = $1 AND status IN ('CONFIRMED','DISPATCHED','HANDED_OVER','ACTIVE_RENTAL','RETURN_SCHEDULED','RETURNED_PENDING_INSPECTION')`,
        [productId]
      );
      if (activeOrders.rows.length > 0) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CATALOG.PRODUCT_IN_ACTIVE_RENTAL, 'PRODUCT_IN_ACTIVE_RENTAL');
      }

      await client.query(
        `UPDATE products SET status = 'INACTIVE', is_deleted = true, updated_at = NOW() WHERE id = $1`,
        [productId]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async updateInventory(vendorUserId, productId, { available, maintenance }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const product = await client.query(
        'SELECT id FROM products WHERE id = $1 AND vendor_user_id = $2 AND is_deleted = false',
        [productId, vendorUserId]
      );
      if (product.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.CATALOG.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      const updates = [];
      const values = [productId];
      let idx = 2;
      if (available !== undefined) {
        updates.push(`available = $${idx}`);
        values.push(available);
        idx++;
      }
      if (maintenance !== undefined) {
        updates.push(`maintenance = $${idx}`);
        values.push(maintenance);
        idx++;
      }

      await client.query(`UPDATE inventory SET ${updates.join(', ')} WHERE product_id = $1`, values);
      await client.query('COMMIT');

      const invResult = await pool.query(
        'SELECT available, reserved, rented, maintenance FROM inventory WHERE product_id = $1',
        [productId]
      );
      return invResult.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getInventory(productId) {
    const result = await pool.query(
      'SELECT available, reserved, rented, maintenance, (available + reserved + rented + maintenance) as total FROM inventory WHERE product_id = $1',
      [productId]
    );
    if (result.rows.length === 0) return null;
    return result.rows[0];
  },

  async createPricing(vendorUserId, productId, { period, duration, price, deposit }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const product = await client.query(
        'SELECT id FROM products WHERE id = $1 AND vendor_user_id = $2 AND is_deleted = false',
        [productId, vendorUserId]
      );
      if (product.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.CATALOG.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      const existing = await client.query(
        'SELECT id FROM product_pricing WHERE product_id = $1 AND period = $2 AND duration = $3',
        [productId, period, duration]
      );
      if (existing.rows.length > 0) {
        throw new ApiError(HTTP_STATUS.CONFLICT, MESSAGES.CATALOG.PRICING_ALREADY_EXISTS, 'PRICING_ALREADY_EXISTS');
      }

      const result = await client.query(
        `INSERT INTO product_pricing (product_id, period, duration, price, deposit)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, period, duration, price, deposit`,
        [productId, period, duration, price, deposit || 0]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getPricing(productId) {
    const result = await pool.query(
      'SELECT id, period, duration, price, deposit FROM product_pricing WHERE product_id = $1 ORDER BY period, duration',
      [productId]
    );
    return result.rows;
  },

  async updatePricing(vendorUserId, pricingId, data) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const pricing = await client.query(
        `SELECT pp.id, pp.product_id FROM product_pricing pp
         JOIN products p ON pp.product_id = p.id
         WHERE pp.id = $1 AND p.vendor_user_id = $2 AND p.is_deleted = false`,
        [pricingId, vendorUserId]
      );
      if (pricing.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.CATALOG.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      const updates = [];
      const values = [pricingId];
      let idx = 2;
      const fields = ['period', 'duration', 'price', 'deposit'];
      for (const field of fields) {
        if (data[field] !== undefined) {
          updates.push(`${field} = $${idx}`);
          values.push(data[field]);
          idx++;
        }
      }
      if (updates.length === 0) {
        throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'No fields to update');
      }

      const result = await client.query(
        `UPDATE product_pricing SET ${updates.join(', ')} WHERE id = $1 RETURNING id, period, duration, price, deposit`,
        values
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async deletePricing(vendorUserId, pricingId) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const pricing = await client.query(
        `SELECT pp.id FROM product_pricing pp
         JOIN products p ON pp.product_id = p.id
         WHERE pp.id = $1 AND p.vendor_user_id = $2 AND p.is_deleted = false`,
        [pricingId, vendorUserId]
      );
      if (pricing.rows.length === 0) {
        throw new ApiError(HTTP_STATUS.FORBIDDEN, MESSAGES.CATALOG.FORBIDDEN_NOT_OWNER, 'FORBIDDEN_NOT_OWNER');
      }

      await client.query('DELETE FROM product_pricing WHERE id = $1', [pricingId]);
      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async createReturnSlot(vendorUserId, { date, slotLabel, capacity }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const result = await client.query(
        `INSERT INTO return_slots (vendor_user_id, date, slot_label, capacity)
         VALUES ($1, $2, $3, $4)
         RETURNING id, date, slot_label as "slotLabel", capacity, booked_count as "bookedCount"`,
        [vendorUserId, date, slotLabel, capacity]
      );

      await client.query('COMMIT');
      return result.rows[0];
    } catch (err) {
      if (err.code === '23505') {
        throw new ApiError(HTTP_STATUS.CONFLICT, 'Return slot already exists for this date and time', 'RETURN_SLOT_EXISTS');
      }
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async getReturnSlots(vendorUserId, date) {
    const result = await pool.query(
      `SELECT id, date, slot_label as "slotLabel", capacity, booked_count as "bookedCount"
       FROM return_slots WHERE vendor_user_id = $1 AND date = $2 ORDER BY slot_label`,
      [vendorUserId, date]
    );
    return result.rows;
  },

  async upsertLateFeeRule(vendorUserId, { gracePeriodHours, rateType, rateAmount, maxCap }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO late_fee_rules (vendor_user_id, grace_period_hours, rate_type, rate_amount, max_cap)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (vendor_user_id) DO UPDATE SET
           grace_period_hours = EXCLUDED.grace_period_hours,
           rate_type = EXCLUDED.rate_type,
           rate_amount = EXCLUDED.rate_amount,
           max_cap = EXCLUDED.max_cap`,
        [vendorUserId, gracePeriodHours || 0, rateType, rateAmount, maxCap]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },

  async upsertCancellationPolicy(vendorUserId, { fullRefundHoursBefore, partialRefundHoursBefore, partialRefundPercent }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        `INSERT INTO cancellation_policies (vendor_user_id, full_refund_hours_before, partial_refund_hours_before, partial_refund_percent)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (vendor_user_id) DO UPDATE SET
           full_refund_hours_before = EXCLUDED.full_refund_hours_before,
           partial_refund_hours_before = EXCLUDED.partial_refund_hours_before,
           partial_refund_percent = EXCLUDED.partial_refund_percent`,
        [vendorUserId, fullRefundHoursBefore ?? 24, partialRefundHoursBefore ?? 6, partialRefundPercent ?? 50]
      );

      await client.query('COMMIT');
      return true;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  },
};