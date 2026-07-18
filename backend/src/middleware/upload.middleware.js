import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const UPLOAD_BASE = path.join(process.cwd(), 'uploads');
const THUMBNAIL_DIR = path.join(UPLOAD_BASE, 'products', 'thumbnails');
const GALLERY_DIR = path.join(UPLOAD_BASE, 'products', 'gallery');

[THUMBNAIL_DIR, GALLERY_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) {
        return cb(new Error('Invalid file type. Only JPG, PNG, WEBP allowed.'), false);
    }
    cb(null, true);
};

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        if (file.fieldname === 'thumbnail') {
            cb(null, THUMBNAIL_DIR);
        } else if (file.fieldname === 'images') {
            cb(null, GALLERY_DIR);
        } else {
            cb(new Error('Unexpected field'), false);
        }
    },
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        const uniqueName = `${Date.now()}-${uuidv4().slice(0, 8)}${ext}`;
        cb(null, uniqueName);
    },
});

export const uploadProductImages = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 11,
    },
}).fields([
    { name: 'thumbnail', maxCount: 1 },
    { name: 'images', maxCount: 10 },
]);

export const getThumbnailUrl = (filename) => `/uploads/products/thumbnails/${filename}`;
export const getGalleryUrl = (filename) => `/uploads/products/gallery/${filename}`;

export const deleteFile = (filePath) => {
    const fullPath = path.join(process.cwd(), filePath);
    if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
    }
};

export { THUMBNAIL_DIR, GALLERY_DIR };