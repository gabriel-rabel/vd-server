import express from "express"; // Importing the Express.js framework.
import UserModel from "../model/user.model.js"; // Importing the UserModel, presumably a model for your user data.
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

// Create an instance of Express Router
const userRouter = express.Router();

// Set the number of rounds for password hashing (default value: 10)
const SALT_ROUNDS = 10; // Configuring the number of iterations for the salt. Higher numbers increase security but take more time.

//SIGNUP
// Define a route for handling user signup requests
userRouter.post("/signup", async (req, res) => {
  try {
    // Get the form data from the request body
    const form = req.body;

    if (!form.email || !form.password) {
      throw new Error("Por favor, envie um email e uma senha");
    }

    // Check if the email is already in use
    const existingUser = await UserModel.findOne({ email: form.email });

    if (existingUser) {
      return res.status(400).json({
        error: "Este e-mail já está cadastrado. Por favor, use outro e-mail.",
      });
    }

    // Check if the password meets certain requirements using a regular expression
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
    const user = await UserModel.create({
      ...form,
      passwordHash: hashedPassword,
    });

    // Remove the passwordHash from the user object to avoid returning the hashed password in the response (for security reasons)
    user.passwordHash = undefined;

    // Return the newly created user as a JSON response with status code 201 (Created)
    return res.status(201).json(user);
  } catch (err) {
    // If an error occurs during signup, log the error and return a JSON response with status code 500 (Internal Server Error)
    console.log(err);
    return res.status(500).json(err);
  }
});


//LOGIN
// Define a route for handling user login requests (empty for now, implementation not provided)
userRouter.post("/login", async (req, res) => {
  try {
    const form = req.body;
    if (!form.email || !form.password) {
      throw new Error("Por favor, preencha todos os dados!");
    }

    // procuro o user pelo email dentro do banco de dados
    const user = await UserModel.findOne({ email: form.email });

    //compare() também retorna TRUE se for igual as senhas e retorna FALSE se a senha não foi igual!!
    if (await bcrypt.compare(form.password, user.passwordHash)) {
      //senhas iguais, pode fazer login

      //gerar um token
      const token = generateToken(user);

      // Remove a passwordHash do objeto do usuário para evitar retornar a senha criptografada na resposta (por motivos de segurança)
      user.passwordHash = undefined;

      return res.status(200).json({
        user: user,
        token: token,
      });
    } else {
      //senhas diferentes, não pode fazer login
      throw new Error(
        "Email ou senha não são válidos. Por favor tenta novamente."
      );
    }
  } catch (err) {
    // Se ocorrer erros durante o login, log de error e retorne uma resposta JSON com o status code 500 (Internal Server Error)
    console.log(err);
    return res.status(500).json(err.message);
  }
});

//GET PROFILE
// Define a route for handling user profile requests (empty for now, implementation not provided)
userRouter.get("/profile", isAuth, async (req, res) => {
  try {
    const id_user = req.auth._id;

    const user = await UserModel.findById(id_user)
      .select("-passwordHash")
      .populate("history_jobs");

    return res.status(200).json(user);
  } catch (err) {
    console.log(err);
    return res.status(500).json(err);
  }
});

//EDIT USER

userRouter.put("/edit", isAuth, async (req, res) => {
  try {
    const id_user = req.auth._id;
    const updatedUser = await UserModel.findByIdAndUpdate(
      id_user,
      { ...req.body },
      { new: true, runValidators: true }
    );

    return res.status(200).json(updatedUser);
  } catch (error) {
    console.log(err);
    return res.status(500).json(err);
  }
});

///// Rota para redefinir a senha do modelo "user" //FUNCIONANDO PERFEITAMENTE NAO MEXER
userRouter.post("/forgot-password", async (req, res) => {
  try {
    // Extrai o e-mail da requisição
    const form = req.body;

    // Inicializa uma variável para rastrear se o email foi encontrado
    let emailFound = false;

    // Busca o usuário no banco de dados pelo e-mail
    const user = await UserModel.findOne({ email: form.email });

    // Verifica se o usuário está cadastrado
    if (user) {
      emailFound = true;
      // O email foi encontrado, prossiga com a geração e envio do email
    }

    if (emailFound) {
      // Gerar token temporário para redefinição de senha
      const resetToken = jwt.sign(
        { _id: user._id },
        process.env.SIGN_SECRET_RESET_PASSWORD,
        {
          expiresIn: "20m",
        }
      );

      user.resetPassword = resetToken;
      await user.save();

      // Implementação do envio de email aqui (pode usar Nodemailer ou outra biblioteca)

      // Se você já tem o token JWT como uma string
      const token = resetToken;

      // Converte a string do token JWT em um ArrayBuffer
      const tokenArrayBuffer = new TextEncoder().encode(token);

      // Codifica o token usando Base64Url
      const encodedToken = jseu.encoder.encodeBase64Url(tokenArrayBuffer);

      const resetPasswordLink = `http://localhost:5173/user/reset-password/${encodedToken}`;
      const mailOptions = {
        from: process.env.NODEMAILER_USER,
        to: user.email,
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
  userRouter.put("/new-password/:token", async (req, res) => {
    try {
      const token = req.params.token;
  
      if (!token) {
        return res.status(400).json({ msg: "Incorrect or invalid Token" });
      }
  
      jwt.verify(token, process.env.SIGN_SECRET_RESET_PASSWORD, async (err, decoded) => {
        if (err) {
          console.error("Error verifying token:", err); // Adicione este log
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }
  
        const user = await UserModel.findOne({ resetPassword: token });
  
        if (!user) {
          console.error("User not found for token:", token); // Adicione este log
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }
  
        const { newPassword } = req.body;
  
        if (
          !newPassword ||
          !newPassword.match(
            /^(?=.*[A-Z])(?=.*[$*&@#]).+$/
          )
        ) {
          return res.status(400).json({
            msg: "A senha requer pelo menos uma letra maiúscula, um número e um caractere especial.",
          });
        }
  
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
  
        const hashedPassword = await bcrypt.hash(newPassword, salt);
  
        await UserModel.findOneAndUpdate(
          { _id: user._id },
          { $set: { passwordHash: hashedPassword, resetPassword: "" } }
        );
  
        return res.status(200).json({ msg: "Password Updated!" });
      });
    } catch (error) {
      console.error("Error in password reset route:", error); // Adicione este log
      return res.status(500).json({ msg: error.message });
    }
  });
  

  // Rota buscar token válido
  userRouter.get("/reset-password/valid-token/:token", async (req, res) => {
    try {
      const token = req.params.token; // Acesse o token dos parâmetros da URL

      if (!token) {
        return res.status(400).json({ msg: "Incorrect or invalid Token" });
      }

      jwt.verify(token, process.env.SIGN_SECRET_RESET_PASSWORD, async (err) => {
        if (err) {
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }

        const user = await UserModel.findOne({ resetPassword: token });

        if (!user) {
          return res.status(400).json({ msg: "Incorrect or invalid Token" });
        }

        return res.status(200).json({ msg: true });
      });
    } catch (error) {
      return res.status(500).json({ msg: error.message });
    }
  });
});

// Export the userRouter, making it available for use in other parts of the application
export default userRouter;
