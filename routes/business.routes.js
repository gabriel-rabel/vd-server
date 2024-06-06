import express from "express"; // Importing the Express.js framework.
import BusinessModel from "../model/business.model.js";
import bcrypt from "bcrypt"; // Importing the bcrypt library for password hashing.
import generateToken from "../config/jwt.config.js";
import isAuth from "../middlewares/isAuth.js";
import jwt from "jsonwebtoken";
import nodemailer from "nodemailer";
import jseu from "js-encoding-utils";


const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.NODEMAILER_USER,
    pass: process.env.NODEMAILER_PW,
  },
});

//instanciar o router
const businessRoute = express.Router();

const SALT_ROUNDS = 10;

businessRoute.post("/signup", async (req, res) => {
  try {
    const form = req.body;

    if (!form.email || !form.password) {
      throw new Error("Por favor, envie um email e uma senha");
    }

    const existingUser = await BusinessModel.findOne({ email: form.email });

    if (existingUser) {
      return res.status(400).json({
        error: "Este e-mail já está cadastrado. Por favor, use outro e-mail.",
      });
    }

    if (
      form.password.match(
        /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/gm
      ) === false
    ) {
      // If the password does not meet the requirements, throw an error
      throw new Error(
        "A senha não preenche os requisitos básicos. 8 caracteres. Maiuscula e minuscula. Numeros e caracteres especiais."
      );
    }

    // Generate a salt for password hashing using bcrypt
    const salt = await bcrypt.genSalt(SALT_ROUNDS);

    // Hash the user's password using the generated salt
    const hashedPassword = await bcrypt.hash(form.password, salt);

    // Create a new user in the database with the hashed password
    const business = await BusinessModel.create({
      ...form,
      passwordHash: hashedPassword,
    });

    // Remove the passwordHash from the user object to avoid returning the hashed password in the response (for security reasons)
    business.passwordHash = undefined;

    // Return the newly created user as a JSON response with status code 201 (Created)
    return res.status(201).json(business);
  } catch (error) {
    console.log(error);
    return res.status(500).json(error);
  }
});

businessRoute.post("/login", async (req, res) => {
  try {
    const form = req.body;
    if (!form.email || !form.password) {
      throw new Error("Por favor, preencha todos os dados!");
    }

    // procuro o usuário pelo email dentro do banco de dados
    const business = await BusinessModel.findOne({ email: form.email });

    if (business) {
      // Se o usuário for encontrado, compare as senhas
      if (await bcrypt.compare(form.password, business.passwordHash)) {
        // Senhas iguais, pode fazer login

        // Gerar um token
        const token = generateToken(business);

        // Remover o passwordHash do objeto de usuário para evitar retornar a senha criptografada na resposta (por motivos de segurança)
        business.passwordHash = undefined;

        return res.status(200).json({
          user: business,
          token: token,
        });
      } else {
        // Senhas diferentes, não pode fazer login
        throw new Error(
          "Email ou senha não são válidos. Por favor tente novamente."
        );
      }
    } else {
      // Usuário não encontrado com o email fornecido
      throw new Error("Usuário não encontrado com o email fornecido.");
    }
  } catch (error) {
    // Manipular erro
    console.log(error);
    return res.status(500).json({ error: error.message });
  }
});

businessRoute.get("/profile", isAuth, async (req, res) => {
    try {

        const id_business = req.auth._id;

        const business = await BusinessModel.findById(id_business).select("-passwordHash").populate("offers")

        return res.status(200).json(business);
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
        
    }
})


businessRoute.put("/edit", isAuth, async (req, res) => {

    try {

        const id_business = req.auth._id;

        const updatedBusiness = await BusinessModel.findByIdAndUpdate(
            id_business,
            { ...req.body },
            {new: true, runValidators: true } //por padrao o mongo nao confere a schema
        ).select("-passwordHash");

        return res.status(200).json(updatedBusiness);
        
    } catch (error) {
        console.log(error);
        
        return res.status(500).json(error);
        
    }
  
})


businessRoute.delete("/delete", isAuth, async (req, res) => {
    try {
        const id_business = req.auth._id;

        const deletedBusiness = await BusinessModel.findByIdAndUpdate(
            id_business,
            {active: false}
        );

        return res.status(200).json(deletedBusiness);
        
    } catch (error) {
        console.log(error);
        return res.status(500).json(error);
        
    }
})

///// Rota para redefinir a senha do modelo "business" 

businessRoute.post("/forgot-password", async (req, res) => {
  try {
    // Extrai o e-mail da requisição
    const form = req.body;

    // Inicializa uma variável para rastrear se o email foi encontrado
    let emailFound = false;

    // Busca o usuário no banco de dados pelo e-mail
    const business = await BusinessModel.findOne({ email: form.email });

    // Verifica se o usuário está cadastrado
    if (business) {
      emailFound = true;
      // O email foi encontrado, prossiga com a geração e envio do email
    }

    if (emailFound) {
      // Gerar token temporário para redefinição de senha
      const resetToken = jwt.sign(
        { _id: business._id },
        process.env.SIGN_SECRET_RESET_PASSWORD,
        {
          expiresIn: "20m",
        }
        
      );
      

      business.resetPassword = resetToken;
      await business.save();

      // Implementação do envio de email aqui (pode usar Nodemailer ou outra biblioteca)

      // Se você já tem o token JWT como uma string
      const token = resetToken;

      // Converte a string do token JWT em um ArrayBuffer
      const tokenArrayBuffer = new TextEncoder().encode(token);

      // Codifica o token usando Base64Url
      const encodedToken = jseu.encoder.encodeBase64Url(tokenArrayBuffer);

      //const resetPasswordLink = `http://localhost:5173/business/reset-password/${encodedToken}`;
      const resetPasswordLink = `https://vagasdaqui.com.br/business/reset-password/${encodedToken}`;
      const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to: business.email,
        subject: "Redefinição de Senha VagasDaqui.com.br",
        html: `
        <p>Caro usuário do VagasDaqui,</p>
        <p>Recebemos uma solicitação de redefinição de senha para a sua conta no nosso Portal. Para continuar o processo de redefinição de senha, siga as etapas abaixo:</p>
        <ol>
          <li>Clique no link abaixo para redefinir sua senha:</li>
          <p><a href="${resetPasswordLink}">Redefinir Senha Agora</a></p>
          <p>(O link acima é válido por 20 minutos. Se você não concluir o processo dentro desse período, será necessário fazer outra solicitação de redefinição de senha.)</p>
          <li>Você será redirecionado para uma página onde poderá criar uma nova senha segura. Certifique-se de escolher uma senha forte, contendo pelo menos 8 caracteres, incluindo maiúsculas, minúsculas, números e caracteres especiais.</li>
          <li>Após redefinir sua senha, você poderá acessar sua conta com as novas credenciais.</li>
        </ol>
        <p>Se você não solicitou a redefinição de senha, ignore este e-mail. Sua conta permanecerá segura.</p>
        <p>Caso tenha algum problema ou dúvida, entre em contato com nossa equipe de suporte em <a href="mailto:suporte@vagasdaqui.com.br">suporte@vagasdaqui.com.br</a>.</p>
        <p>Agradecemos por escolher o VagasDaqui como seu portal de oportunidades de emprego.</p>
        <p>Atenciosamente, A Equipe VagasDaqui.com.br</p>
      `,
      };

      // Envie o email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          return res
            .status(500)
            .json({ msg: "Erro ao enviar o e-mail: " + err.message });
        }

        // Envio de e-mail bem-sucedido, você pode incluir algum código adicional aqui, se necessário.
        return res.status(200).json({ msg: "E-mail enviado com sucesso" });
      });
    } else {
      return res.status(400).json({ msg: "Usuário não encontrado" });
    }
  } catch (error) {
    return res.status(500).json({ msg: error.message });
  }

  ////// Rota de atualização da senha e banco
  businessRoute.put("/new-password/:token", async (req, res) => {
    try {
      const token = req.params.token;
      console.log(token);
  
      if (!token) {
        return res.status(400).json({ msg: "Incorrect or invalid Token" });
      }
  
      jwt.verify(token, process.env.SIGN_SECRET_RESET_PASSWORD, async (err, decoded) => {
        if (err) {
          console.error("Error verifying token:", err); // Adicione este log
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }
  
        const business = await BusinessModel.findOne({ resetPassword: token });
        console.log(business);
  
        if (!business) {
          console.error("Business not found for token:", token); // Adicione este log
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }
  
        const { newPassword } = req.body;
  
        if (
          !newPassword ||
          !newPassword.match(
            /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$ %^&*-]).{8,}$/gm
          )
        ) {
          return res.status(400).json({
            msg: "A senha requer pelo menos uma letra maiúscula, um número e um caractere especial.",
          });
        }
  
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
  
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        console.log(hashedPassword);
  
        await BusinessModel.findOneAndUpdate(
          { _id: business._id },
          { $set: { passwordHash: hashedPassword, resetPassword: "" } }
        );
        console.log(business);
  
        return res.status(200).json({ msg: "Password Updated!" });
      });
    } catch (error) {
      console.error("Error in password reset route:", error); // Adicione este log
      return res.status(500).json({ msg: error.message });
    }
  });
  

  // Rota buscar token válido
  businessRoute.get("/reset-password/valid-token/:token", async (req, res) => {
    try {
      const token = req.params.token; // Acesse o token dos parâmetros da URL

      if (!token) {
        return res.status(400).json({ msg: "Incorrect or invalid Token" });
      }

      jwt.verify(token, process.env.SIGN_SECRET_RESET_PASSWORD, async (err) => {
        if (err) {
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }

        const business = await BusinessModel.findOne({ resetPassword: token });

        if (!business) {
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }

        return res.status(200).json({ msg: true });
      });
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  });
});



//exportar a rota
export default businessRoute;
