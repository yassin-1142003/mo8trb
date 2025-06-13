import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['owner', 'renter'] },
  role_id: String,
  national_id: String,
  avatar: String, // مسار الصورة
  national_id_pic: String, // مسار البطاقة
});

export default mongoose.model('User', userSchema);
