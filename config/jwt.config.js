import jwt from "jsonwebtoken";

export default function generateToken(user) {
  //user._id user.email user.role user.name

  //assinatura  TOKEN_SIGN_SECRET de dentro do arquivo .env config
  const signature = process.env.TOKEN_SIGN_SECRET;

  //tempo de expiração (padrão da industria é 12h)
  const expiration = "12h";

  return jwt.sign(
    {
      //payload -> infos  que quero guardar no token
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
    },
    signature, //assinatura do token
    {
      //objeto de configuração determinando a validade do token
      expiresIn: expiration,
    }
  );
}
