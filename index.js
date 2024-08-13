const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken'); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

// Initialize dotenv to read environment variables from a .env file
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());



const uri = `mongodb://${process.env.DB_USER}:${process.env.DB_PASS}@ac-sldedcd-shard-00-00.nzdhwhu.mongodb.net:27017,ac-sldedcd-shard-00-01.nzdhwhu.mongodb.net:27017,ac-sldedcd-shard-00-02.nzdhwhu.mongodb.net:27017/?ssl=true&replicaSet=atlas-6yxqq5-shard-0&authSource=admin&retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

app.get('/', (req, res) => {
    res.send('Hello World!');
});

async function run() {
    try {
        // Connect the client to the server
        await client.connect();
        console.log('Connected successfully to MongoDB');
// JWT 
app.post('/jwt', async (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
  res.send({ token });
});

const verifyToken = (req, res, next) => {
  if (!req.headers.authorization) {
      return res.status(401).send({ message: 'Unauthorized access' });
  }
  const token = req.headers.authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
      if (err) {
          return res.status(403).send({ message: 'Unauthorized access' });
      }
      req.user = decoded;
      next();
  });
};

const verifyAdmin = async (req, res, next) => {
  const email = req.user.email;
  const query = { email: email };
  const user = await userCollection.findOne(query);
  const isAdmin = user?.role === 'admin';
  if (!isAdmin) {
      return res.status(403).send({ message: 'Forbidden access' });
  }
  next();
};
        // Access the database and collection using the client
        const userCollection = client.db("studyDb").collection("users");
        const studySessionCollection = client.db("studyDb").collection("studySessions");

        // Add new user
        app.post('/users', async (req, res) => {
            try {
                const user = req.body;
                const query = { email: user.email };
                const existingUser = await userCollection.findOne(query);
                if (existingUser) {
                    return res.send({ message: 'User already exists', insertedId: null });
                }
                const result = await userCollection.insertOne(user);
                res.send(result);
            } catch (error) {
                console.error('Error inserting user:', error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // Update user
        app.put('/users',verifyToken, async (req, res) => {
            const { email, role, status } = req.body;
            console.log('req.body',req.body)
            const result = await userCollection.updateOne(
                { email },
                { $set: { role, status } },
                { returnOriginal: false }
            );
            
            res.send(result.value);
        });

        // Get all users
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error('Error retrieving users:', error);
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        // Get user by email
        app.get('/users/:email', verifyToken, async (req, res) => {
            const email = req.params.email;
            const result = await userCollection.findOne({ email });
            res.send(result);
        });


//  search option 
app.get('/search', async (req, res) => {
    const { search } = req.query;
    let query = {};
    // if (search) {
    //   query = {
    //     $or: [
    //       { email: { $regex: search, $options: 'i' } },
    //       { name: { $regex: search, $options: 'i' } }
    //     ]
    //   };
    // }
    const result = await userCollection.find({
          $or: [
            { name: { $regex: search, $options: 'i' } },
            { email: { $regex: search, $options: 'i' } }
          ]
        }).toArray();
    console.log('req', req.query);

    // const result = await userCollection.find(query).toArray();
    console.log(result)
    res.send(result);
  });



// for Admin users manage part who tutor or who student 
app.patch('/users/:id/role', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
  
   const result= await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { role } }
    );
    res.send(result);
  });
  
  app.patch('/users/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
  
 const result=   await userCollection.updateOne(
      { _id: new ObjectId(id) },
      { $set: { status } }
    );
    res.send(result);
  });
  
// for All Study session collection
 app.post('/study-session', async(req, res)=>{
    const sessionData =req.body;
    const result = await studySessionCollection.insertOne(sessionData);
    res.send(result);
 })

// for All Session
 app.get('/session-collection',verifyToken, verifyAdmin,  async(req, res)=>{
    const result = await studySessionCollection.find().toArray();
    console.log(result);
    res.send(result);
 })


// for Specific user  means tutor
 app.get('/study-session/:email', verifyToken, async (req, res) => {
    const email = req.params.email;
    const result = await studySessionCollection.findOne({ email });
    res.send(result);
});













        // Confirm a successful connection
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (err) {
        console.error('Error connecting to MongoDB:', err);
    }
}

run().catch(console.dir);

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});
