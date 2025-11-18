const mongoose = require('mongoose');

module.exports = async (uri) => {
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  console.log('✅ MongoDB connected');
};
