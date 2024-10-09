const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const dotenv = require('dotenv');

dotenv.config();

// Initialize DynamoDB client
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const dynamoDB = DynamoDBDocumentClient.from(dynamoDBClient);

// Create a contact
const createContact = async (req, res) => {
  try {
    const { Sno, firstName, lastName, email, mobileNumber, message } = req.body;

    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_CONTACT,
      Item: {
        Sno: Sno,
        firstName,
        lastName,
        email,
        mobileNumber,
        message,
      },
    };

    // Use PutCommand to insert the item
    await dynamoDB.send(new PutCommand(params));

    res.status(201).json({ message: 'Contact created successfully' });
  } catch (error) {
    console.error('Error creating contact:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

// Get all contacts
const getAllContacts = async (req, res) => {
  try {
    const params = {
      TableName: process.env.DYNAMODB_TABLE_NAME_CONTACT,
    };

    // Use ScanCommand to retrieve all items from the DynamoDB table
    const data = await dynamoDB.send(new ScanCommand(params));

    // Extract the items from the response
    const contacts = data.Items;

    // Return the contacts as a JSON response
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error fetching contacts:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};

module.exports = { createContact, getAllContacts };
