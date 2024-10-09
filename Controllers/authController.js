const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, DeleteCommand } = require('@aws-sdk/lib-dynamodb');
const nodemailer = require('nodemailer');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');

dotenv.config();

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

const generateRandomCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const sendVerificationCode = async (email) => {
  const code = generateRandomCode();

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USERNAME,
      pass: process.env.EMAIL_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.EMAIL_USERNAME,
    to: email,
    subject: 'Password Reset Verification Code',
    text: `Your password reset verification code is: ${code} , Expires in 10 minutes`,
  };

  await transporter.sendMail(mailOptions);
  return code;
};

const storeResetCode = async (email, resetCode) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_AUTH,
    Item: {
      email: email,
      resetCode: resetCode,
      expirationTime: Math.floor(Date.now() / 1000) + 600, // 10 minutes expiration
    },
  };

  await dynamoDB.send(new PutCommand(params));
};

const verifyResetCode = async (email, providedCode) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_AUTH,
    Key: {
      email: email,
    },
  };

  const result = await dynamoDB.send(new GetCommand(params));
  const storedData = result.Item;

  if (!storedData || storedData.resetCode !== providedCode) {
    return false;
  }

  if (storedData.expirationTime < Math.floor(Date.now() / 1000)) {
    return false; // Code has expired
  }

  return true;
};

const getUserByEmail = async (email) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_USERS,
    Key: {
      email: email,
    },
  };

  const result = await dynamoDB.send(new GetCommand(params));
  return result.Item;
};

const initiatePasswordReset = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const resetCode = await sendVerificationCode(email);
    await storeResetCode(email, resetCode);

    res.json({ message: "Password reset code sent to your email" });
  } catch (error) {
    console.error('Error initiating password reset:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    const isCodeValid = await verifyResetCode(email, resetCode);
    if (!isCodeValid) {
      return res.status(400).json({ message: "Invalid or expired reset code" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_USERS,
      Key: { email },
      UpdateExpression: "set password = :password",
      ExpressionAttributeValues: {
        ":password": hashedPassword,
      },
    };
    await dynamoDB.send(new UpdateCommand(params));

    // Remove the reset code from the auth table
    const deleteParams = {
      TableName: process.env.DYNAMODB_TABLE_NAME_AUTH,
      Key: { email },
    };
    await dynamoDB.send(new DeleteCommand(deleteParams));

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    console.error('Error resetting password:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { initiatePasswordReset, resetPassword };
