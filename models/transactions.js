const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UsersSchema = new Schema({
	type: String,
	sender:	Schema.Types.ObjectId,
	recipient: Schema.Types.ObjectId,
	amount: Number,
	description: String,
	couponCode: String
}, {
	timestamps: true
});
module.exports = mongoose.model('Transactions', UsersSchema, 'transactions');