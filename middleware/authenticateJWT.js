const jwt = require('jsonwebtoken');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocument, GetCommand } = require('@aws-sdk/lib-dynamodb');
const dotenv = require('dotenv');

dotenv.config();

// AWS SDK Configuration
const dynamoDBClient = new DynamoDBClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const dynamoDB = DynamoDBDocument.from(dynamoDBClient);
const AUTH_TABLE_NAME = process.env.DYNAMODB_TABLE_NAME_USERS;

const authenticateJWT = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader) {
    const token = authHeader.split(' ')[1];

    try {
      // Verify the token and extract the user information
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userEmail = decoded.email;

      // Check if the email exists in the DynamoDB auth table
      const params = {
        TableName: AUTH_TABLE_NAME,
        Key: { email: userEmail },
      };

      const result = await dynamoDB.send(new GetCommand(params));

      // If the email is not found, send a 403 Forbidden status
      if (!result.Item) {
        return res.sendStatus(403); // Forbidden
      }

      // Set the user info in the request object and proceed
      req.user = decoded;
      next();
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        console.error('Token expired:', err);
        return res.status(401).json({ message: 'Token expired' });
      } else {
        console.error('Error verifying token or checking database:', err);
        return res.sendStatus(403); // Forbidden
      }
    }
  } else {
    return res.sendStatus(401); // Unauthorized
  }
};

module.exports = authenticateJWT;
