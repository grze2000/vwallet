const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('mongoose-type-email');

const UsersSchema = new Schema({
//	id: mongoose.Schema.Types.ObjectId,
	firstname: String,
	lastname: String,
	email: mongoose.SchemaTypes.Email,
	password: String
});
module.exports = mongoose.model('Users', UsersSchema, 'test1');