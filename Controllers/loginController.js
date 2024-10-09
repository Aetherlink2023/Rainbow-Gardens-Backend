const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { DynamoDBClient, PutItemCommand, GetItemCommand } = require('@aws-sdk/client-dynamodb');
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv');
dotenv.config();

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });

async function signup(req, res) {
  try {
    const { email, password } = req.body;

    // Check if the user already exists
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    const unoNumber = uuidv4();

    // Save the user to DynamoDB
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_USERS,
      Item: {
        email: { S: email },  // DynamoDB requires specifying the data type (S for string)
        password: { S: hashedPassword },
        unoNumber: { S: unoNumber },
      }
    };
    // Use the v3 client to send the PutItemCommand
    await dynamoDBClient.send(new PutItemCommand(params));

    res.status(201).json({ message: "User registered successfully", unoNumber });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    // Get the user by email from DynamoDB
    const user = await getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check the password
    const isPasswordValid = await bcrypt.compare(password, user.password.S);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Generate JWT token
    const token = jwt.sign(
      { email: user.email.S },
      process.env.JWT_SECRET,
      { expiresIn: '1m' } // token expires in 1 minute
    );

    res.json({
      message: "Login successful",
      token,
      email: user.email.S,
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}

// Helper function to get user by email from DynamoDB
async function getUserByEmail(email) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE_NAME_USERS,
    Key: {
      email: { S: email },
    }
  };
  
  // Use the v3 client to send the GetItemCommand
  const data = await dynamoDBClient.send(new GetItemCommand(params));
  return data.Item;
}

module.exports = { signup, login };
