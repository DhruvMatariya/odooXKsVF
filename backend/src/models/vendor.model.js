import pool from '../config/db.js';

export const createVendorProfile = async (userId, profileData, client = pool) => {
    const { gst_number, company_name, product_category } = profileData;
    const query = 'INSERT INTO vendor_profiles (user_id, gst_number, company_name, product_category) VALUES ($1, $2, $3, $4) RETURNING *';
    const values = [userId, gst_number, company_name, product_category];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error creating vendor profile: ' + err.message);
    }
};

export const getVendorProfile = async (userId, client = pool) => {
    const query = 'SELECT * FROM vendor_profiles WHERE user_id = $1';
    const values = [userId];
    try {
        const result = await client.query(query, values);
        return result.rows[0];
    } catch (err) {
        throw new Error('Error fetching vendor profile: ' + err.message);
    }
};