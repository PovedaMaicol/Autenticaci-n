const EmailCode = require("./EmailCode");
const User = require("./User");


// Model User estoy creando --> userId
EmailCode.belongsTo(User)
User.hasMany(EmailCode)