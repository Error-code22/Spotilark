// @ts-ignore — multer has no type declarations
import multer from 'multer';
import path from 'path';

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => {
    cb(null, 'uploads/');
  },
  filename: (_req: any, file: any, cb: any) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

export default upload;
