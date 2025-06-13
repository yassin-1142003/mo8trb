// config/database.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('تم الاتصال بقاعدة البيانات بنجاح');
  } catch (error) {
    console.error('فشل الاتصال بقاعدة البيانات:', error.message);
    process.exit(1);
  }
};

export default connectDB;