const catchError = require('../utils/catchError');
const User = require('../models/User');
const { sendEmail } = require('../utils/sendEmail');
const bcrypt = require("bcrypt");
const EmailCode = require('../models/EmailCode');
const jwt = require("jsonwebtoken");
const { error } = require('console');


const getAll = catchError(async(req, res) => {
    const results = await User.findAll();
    return res.json(results);
});

const create = catchError(async(req, res) => {
    delete req.body.isVerified
    const {email, password, firstName, lastName, country, frontBaseUrl} = req.body

    // generacion del codigo
    const code =  require("crypto").randomBytes(64).toString("hex")


    // envio de email
    sendEmail({
        to: email,
        subject: "Verificación de la cuenta",
        text: "Hola, este email es para verificar la cuenta",
        html: ` 
        <div style="max-width: 500px; margin: 50px auto; background-color: #f8fafc; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); font-family: 'Arial', sans-serif; color: #333333;">

      

        <h1 style="color: #007BFF; font-size: 28px; text-align: center; margin-bottom: 20px;">¡Hola ${firstName.toUpperCase()} 👋!</h1>    
  
        
  
        <p style="font-size: 18px; line-height: 1.6; margin-bottom: 25px; text-align: center;">Gracias por registrarte en nuestra aplicación. Para verificar su cuenta, haga clic en el siguiente enlace:</p>
  
        
  
        <div style="text-align: center;">
  
            <a href="${frontBaseUrl}/verify_email/${code}" style="display: inline-block; background-color: #007BFF; color: #ffffff; text-align: center; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 18px;">¡Verificar cuenta!</a>
  
        </div>
  
      </div>
  
  `
    })

    // encriptar el password
    const hashedPassword = await bcrypt.hash(password, 10)

    // guardar el registro creado
    const result = await User.create({...req.body, password: hashedPassword});

    //guardar el codigo
    await EmailCode.create({code, userId: result.id})



    // retorno
    return res.status(201).json(result);
});

const getOne = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.findByPk(id);
    if(!result) return res.sendStatus(404);
    return res.json(result);
});

const remove = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.destroy({ where: {id} });
    if(!result) return res.sendStatus(404);
    return res.sendStatus(204);
});

const update = catchError(async(req, res) => {
    const { id } = req.params;
    const result = await User.update(
        req.body,
        { where: {id}, returning: true }
    );
    if(result[0] === 0) return res.sendStatus(404);
    return res.json(result[1][0]);
});

const veryCode = catchError(async(req, res) => {
    const { code } = req.params

    const userCode = await EmailCode.findOne({where: { code: code } })

    if(!userCode) return res.status(401).json('User not found')

    const user = await User.findByPk(userCode.userId)

    await user.update({ isVerified: true })

    await userCode.destroy()

    return res.json(user)

});

const login = catchError(async(req, res) => {
    const {email, password} = req.body

    // email validation 
    const user = await User.findOne({ where: {email} })
    if(!user) return res.status(401).json({ error: "Invalid credentials" })

    // password validation 
    const isValid = await bcrypt.compare(password, user.password)
    if(!isValid) return res.status(401).json({ error: "Invalid credentials"})

    // token create
    const token = jwt.sign(
        {user},
        process.env.TOKEN_SECRET,
        {expiresIn: "1d"}
    )
    return res.json({user, token})

});

const logged = catchError(async(req, res) => {
    // traigo el usuario
    const user = req.user  
    return res.json(user)

})

const resetPassword = catchError(async(req, res) => {

// traigo email y frontBaseUrl del body
const { email, frontBaseUrl } = req.body

// busco al usuario que coincida con el email del body
const user = await User.findOne({where:{email}})
if(!user) return res.status(401).json({error: "User not found"})

// genero un codigo
const code = require("crypto").randomBytes(64).toString("hex")

//guardo en la base de datos
await EmailCode.create({code, userId: user.id})
const firstName = user.firstName

//envio el email
sendEmail({
    to:email,
    subject: "Update password",
    html: ` 
    <div style="max-width: 500px; margin: 50px auto; background-color: #f8fafc; padding: 30px; border-radius: 10px; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1); font-family: 'Arial', sans-serif; color: #333333;">

  

    <h1 style="color: #007BFF; font-size: 28px; text-align: center; margin-bottom: 20px;">¡Hola ${firstName.toUpperCase()} 👋!</h1>    

    

    <p style="font-size: 18px; line-height: 1.6; margin-bottom: 25px; text-align: center;">Gracias por registrarte en nuestra aplicación. Para verificar su cuenta, haga clic en el siguiente enlace:</p>

    

    <div style="text-align: center;">

        <a href="${frontBaseUrl}/verify_email/${code}" style="display: inline-block; background-color: #007BFF; color: #ffffff; text-align: center; padding: 14px 28px; border-radius: 6px; text-decoration: none; font-weight: bold; font-size: 18px;">¡Cambiar password!</a>

    </div>

  </div>

`
})
return res.json(user)
})

const updatePassword = catchError(async(req, res) => {
    const { code } = req.params
    const { password } = req.body
    
    const userCode =  await EmailCode.findOne({where: {code} })
    if(!userCode) return res.status(401).json({error: "User not found"})
    const user = await User.findByPk(userCode.userId)
    const newPassword = await bcrypt.hash(password, 10)
    const userUpdate = await user.update({password: newPassword})
    await userCode.destroy()


    return res.json(userUpdate)

})
module.exports = {
    getAll,
    create,
    getOne,
    remove,
    update,
    veryCode,
    login,
    logged,
    resetPassword,
    updatePassword
}