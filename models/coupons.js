const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsersSchema = new Schema({
    code: {type: String, minlength: 8, maxlength: 8},
    amount: Number,
    useDate: Date
});
module.exports = mongoose.model('Coupons', UsersSchema, 'coupons');