import mongoose from 'mongoose';

const logSchema = new mongoose.Schema({
  action: {
    type: String,
    required: true,
  },
  user: {
    type: String, // Roll Number or Admin Username
    required: true,
  },
  details: {
    type: String,
  },
  ip: {
    type: String,
  }
}, { timestamps: true });

const Log = mongoose.model('Log', logSchema);
export default Log;
