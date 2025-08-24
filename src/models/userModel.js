const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: { type: String, require: true },
    age: { type: Number, require: true },
    role: { type: String, enum: ['nomade'], default: 'nomade' },
    email: { type: String, required: true, unique: true, lowercase: true, index: true },
    passwordHash: { type: String, require: true }
}, {
    timestamps: true
});

userSchema.methods.comparePassword = async function (plain) {
    return bcrypt.compare(plain, this.passwordHash);
};


module.exports = mongoose.model('User', userSchema);