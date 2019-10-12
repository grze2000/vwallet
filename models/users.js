const mongoose = require('mongoose');
const Schema = mongoose.Schema;
require('mongoose-type-email');

const UsersSchema = new Schema({
    firstname: String,
    lastname: String,
    email: mongoose.SchemaTypes.Email,
    password: String,
    balance: {type: Number, default: 500.0}
});
module.exports = mongoose.model('Users', UsersSchema, 'users');