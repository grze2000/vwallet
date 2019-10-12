const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsersSchema = new Schema({
    type: String,
    sender:	{ type: Schema.Types.ObjectId, ref: 'Users'},
    recipient: { type: Schema.Types.ObjectId, ref: 'Users'},
    amount: Number,
    description: String,
    couponCode: String
}, {
    timestamps: true
});
module.exports = mongoose.model('Transactions', UsersSchema, 'transactions');