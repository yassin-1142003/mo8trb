import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema({
  name: { type: String },
  email: { 
    type: String, 
    required: [true, "Email is required"], 
    unique: true,
    match: [/^\S+@\S+\.\S+$/, "Invalid email format"]
  },
  password: { 
    type: String, 
    required: [true, "Password is required"], 
    minlength: [6, "Password must be at least 6 characters"]
  },
}, { timestamps: true });

userSchema.pre("save", async function () {
  if (this.isModified("password") && this.password) {
    this.password = await bcrypt.hash(this.password, 12);
  }
});

userSchema.methods.matchPassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model("User", userSchema);