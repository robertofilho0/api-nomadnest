const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const env = require('../config/env');
const toJSON = require('./toJSON');

const ROLES = ['nomade', 'admin'];

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: { type: String, enum: ROLES, default: 'nomade' },
    birthDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: {
      ...toJSON,
      transform: (doc, ret) => {
        toJSON.transform(doc, ret);
        delete ret.password;
        return ret;
      },
    },
  },
);

userSchema.pre('save', async function () {
  if (this.isModified('password'))
    this.password = await bcrypt.hash(this.password, env.BCRYPT_ROUNDS);
});

userSchema.methods.comparePassword = function (plain) {
  return bcrypt.compare(plain, this.password);
};

module.exports = mongoose.model('User', userSchema);
module.exports.ROLES = ROLES;
