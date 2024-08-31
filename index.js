const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken'); 
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
dotenv.config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
// Initialize dotenv to read environment variables from a .env file


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
        // await client.connect();
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
  const isAdmin = user?.role.toLowerCase()=== 'admin';
  if (!isAdmin) {
      return res.status(403).send({ message: 'Forbidden access' });
  }
  next();

};

const tutorVerify = async (req, res, next) => {
        const tutorEmail = req.user.email; // Extract email from the decoded token
        const query = { email: tutorEmail }; // Query the database using the extracted email
        const tutor = await userCollection.findOne(query); // Fetch the user document from the collection
        const isTutor = tutor?.role.toLowerCase() === 'tutor';
        if (!isTutor) {
            return res.status(403).send({ message: 'Forbidden access' });
        }
       next();
    
};



        // Access the database and collection using the client
        const userCollection = client.db("studyDb").collection("users");
        const studySessionCollection = client.db("studyDb").collection("studySessions");
        const materialCollection=client.db('studyDb').collection('materialsCollection')
        const bookingCollection=client.db('studyDb').collection('bookedSession')
        const notesCollection= client.db('studyDb').collection('notesCollection')
        const paymentCollection =client.db('studyDb').collection('paymentCollection')

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
            // console.log('req.body',req.body)
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
// become a for new tutor

app.put('/tutors/:email', verifyToken,  async (req, res) => {
    const email = req.params.email;
    const updateData = req.body;

    // Check if the user with the given email is already a tutor
    const existingTutor = await userCollection.findOne({ email, role: 'Tutor' });
    if (existingTutor) {
        return res.status(400).send({ message: 'User is already a Tutor' });
    }

    // Update the user's data
    const result = await userCollection.updateOne(
        { email }, // Filter by email
        { $set: updateData } // Update with the new data
    );

    res.send(result);
    console.log(result);
});
// for data get
app.get('/tutors', async (req,res)=>{
    const result = await userCollection.find({role: 'Tutor'}).toArray();
    res.send(result);
    console.log(result)
})

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
    // console.log('req', req.query);

    // const result = await userCollection.find(query).toArray();
    // console.log(result)
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
 app.post('/study-session', verifyToken, tutorVerify, async(req, res)=>{
    const sessionData =req.body;
    const result = await studySessionCollection.insertOne(sessionData);
    res.send(result);
 })  


// for Home page(cardSession) See All button  and pagination method apply 
app.get('/all-collection', async (req, res) => {
    // Get query parameters for pagination
    const page = parseInt(req.query.page) || 1; // default page is 1
    const limit = parseInt(req.query.limit) || 6; // default limit is 6
    const skip = (page - 1) * limit;
  
    // Fetch paginated results
    const result = await studySessionCollection.find({ status: 'accepted' })
      .skip(skip)
      .limit(limit)
      .toArray();
  
    // Send results
    res.send(result);
  });


//  for All Session for home page
 app.get('/all-collection-all',  async(req, res)=>{
    const result = await studySessionCollection.find({ status: 'accepted' }).toArray();
    res.send(result);
 })

  
 app.get('/all-collection/:id', async (req,res)=>{
    const id = req.params.id;
    const result = await studySessionCollection.findOne({_id: new ObjectId(id)});
    res.send(result);
 })





//  for admin
 app.get('/session-collection',verifyToken, verifyAdmin,  async(req, res)=>{
    const result = await studySessionCollection.find().toArray();
    // console.log(result);
    res.send(result);
 })
// for admin
app.patch('/session-fee/:id',verifyToken, verifyAdmin,  async (req, res) => {
    const id = req.params.id;
    const { sessionFee, status } = req.body;
    console.log('Body:', req.body);
    const filter = { _id: new ObjectId(id) };  // Convert `id` to ObjectId for MongoDB

    const updateDoc = {
        $set: {
            sessionFee: sessionFee,
            status: status,
        }
    };
    // console.log(updateDoc)

    const result = await studySessionCollection.updateOne(filter, updateDoc);
    // console.log('Update Result:', result);
    res.send(result);
});


// for Specific user  means tutor
 app.get('/study-session/:email', verifyToken,tutorVerify, async (req, res) => {
    const email = req.params.email;
    const result = await studySessionCollection.find({ 'tutor.email': email }).toArray();
    res.send(result);
});

// for database update by tutor
app.put('/study-session/:id',verifyToken, async (req, res)=>{
    const sessionId= req.params.id;
    const sessionData = req.body;
    const result= await studySessionCollection.updateOne(
        {_id: new ObjectId(sessionId)},
        {$set:sessionData}
    );
    res.send(result);
})  

app.delete('/study-delete/:id',verifyToken, async(req, res)=>{
    const sessionId= req.params.id;
    const result = await studySessionCollection.deleteOne({ _id: new ObjectId(sessionId)})
    res.send(result);
})
// for get data by gmail tutor for session id Need 
app.get('/tutor/studySessions/:email', verifyToken, tutorVerify, async (req, res) => {
    const { email } = req.params;
    const { email: userEmail } = req.user;
  
    if (email !== userEmail) {
      return res.status(403).send({ message: 'Unauthorized access' });
    }
  
    const result = await studySessionCollection.find({ 'tutor.email': userEmail }).toArray();
    res.send(result);
  });
  
//for view matrial post by tutor
app.post('/uploadMaterial', verifyToken,tutorVerify,async(req,res)=>{
    const materialData = req.body;
    const result = await materialCollection.insertOne(materialData);
    res.send(result);
})
// for tutor his view matrial  elements
app.get('/uploadMaterial/:email',verifyToken, tutorVerify, async (req, res)=>{
    const { email } = req.params;
    // console.log(req.params);
    const result = await materialCollection.find({ email: email }).toArray();
    res.send(result);
    // console.log(result); 
})
// for admin materials
app.get('/admin-material', verifyToken, verifyAdmin, async(req, res)=>{
    const result = await materialCollection.find().toArray();
    res.send(result);
})





app.post('/booking',verifyToken, async(req,res)=>{
    const bookingData = req.body;
    const result = await bookingCollection.insertOne(bookingData);
    res.send(result);
})

// for check already booked or not
app.get('/bookings/check/:sessionId', verifyToken, async(req,res)=>{
    const sessionId = req.params.sessionId;
    const { studentEmail } = req.query;
    const result = await bookingCollection.findOne({ sessionId , studentEmail: studentEmail});
    res.send(result);
})

// booking collection find for single Id or data
app.get('/bookings-payment/:bookingId', async (req, res) => {
    const { bookingId } = req.params;
    // const { studentEmail } = req.query;
    // console.log(bookingId)

    try {
        // Convert bookingId to ObjectId
        const booking = await bookingCollection.findOne({ 
            _id: new ObjectId(bookingId), 
            // studentEmail
        });

        if (!booking) {
            return res.status(404).send({ message: 'Booking not found' });
        }

        res.send(booking);
        console.log(booking)
    } catch (error) {
        res.status(500).send({ message: 'Server error', error });
    }
});

// ......................for all data get by email wise...........................
app.get('/bookedSession/:email',verifyToken, async(req,res)=>{
    const { email } = req.params;
    const result = await bookingCollection.find({ studentEmail: email }).toArray();
    res.send(result);
})
// for review part by student
app.put('/submit-review/:sessionId', verifyToken, async (req, res) => {
    const { sessionId } = req.params;
    const { rating, review, userEmail } = req.body;

    try {
        const session = await studySessionCollection.findOne({ _id: new ObjectId(sessionId) });

        let updateOperation;

        if (!session || !session.reviews || !Array.isArray(session.reviews)) {
            // If the document doesn't exist, doesn't have a reviews field, or reviews is not an array,
            // set it as an array with the new review
            updateOperation = {
                $set: {
                    reviews: [{ rating, review, userEmail }]
                }
            };
        } else {
            // Check if the user has already submitted a review
            const existingReviewIndex = session.reviews.findIndex(r => r.userEmail === userEmail);

            if (existingReviewIndex === -1) {
                // If the user hasn't reviewed yet, add a new review
                updateOperation = {
                    $push: {
                        reviews: { rating, review, userEmail }
                    }
                };
            } else {
                // If the user has already reviewed, update their existing review
                updateOperation = {
                    $set: {
                        [`reviews.${existingReviewIndex}`]: { rating, review, userEmail }
                    }
                };
            }
        }

        const result = await studySessionCollection.updateOne(
            { _id: new ObjectId(sessionId) },
            updateOperation
        );

        res.send(result);
    } catch (error) {
        console.error('Error submitting review:', error);
        res.status(500).send('Error submitting review');
    }
});









  // Payment routes

  app.post('/create-payment-intent',verifyToken, async (req, res) => {
    const { sessionFee } = req.body; // Change 'price' to 'sessionFee'
    const amount = parseInt(sessionFee * 100); // Convert fee to cents for Stripe
    console.log(amount, 'amount inside the intent');
  
    const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
    });
    console.log('Payment intent created:', paymentIntent);
    res.send({
        clientSecret: paymentIntent.client_secret
    });
});





// payment data saved database
app.post('/payment-complete', async (req, res) => {
    const { sessionId, sessionTitle, sessionFee, tutorEmail, userEmail, transactionId } = req.body;

    console.log('Payment complete request received:', {
        sessionId,
        sessionTitle,
        sessionFee,
        tutorEmail,
        userEmail,
        transactionId
    });

    try {
        // Validate input data
        if (!sessionId || !sessionTitle || !sessionFee || !tutorEmail || !userEmail || !transactionId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Save payment information
        const result = await paymentCollection.insertOne({
            sessionId: new ObjectId(sessionId),
            sessionTitle,
            transactionId,
            studentEmail: userEmail,
            tutorEmail,
            amount: parseInt(sessionFee),
            date: new Date(),
        });

        console.log('Payment information saved:', result);

        // Update booking status
        await bookingCollection.updateOne(
            { _id: new ObjectId(sessionId) },
            { $set: { status: 'paid' } }
        );

        res.status(200).json({ success: true, result });
    } catch (error) {
        console.error('Error processing payment completion:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


// Route to get all payments for a specific email
app.get('/payment/:email',verifyToken, async (req, res) => {
    const email = req.params.email;

    // Find all payments for the given email
    const result = await paymentCollection.find({ studentEmail: email }).toArray();
    res.send(result);
});

// for notes by student
app.post('/create-note', verifyToken, async (req, res) => {
       const { title, content, id, user } = req.body;
        const newNote = { title, content, id, user };
        const result = await notesCollection.insertOne(newNote);

        res.send(result);
    } 
    
);
app.get('/note/:email',verifyToken, async(req,res)=>{
    const email = req.params.email;
    const result = await notesCollection.find({ user: email }).toArray();
    res.send(result);
})

app.put('/update-note/:id', verifyToken, async (req, res) => {
     const { id } = req.params;
     const { title, content } = req.body;
     const updatedNote = { title, content };
     const result = await notesCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updatedNote }
    );
    res.send(result);
})
app.delete('/notes-delete/:id', verifyToken, async (req, res) => {
    const id = req.params.id;
    const result = await notesCollection.deleteOne({ _id: new ObjectId(id) });
    res.send(result);
  });
  
  app.get('/study-materials/:email', verifyToken, async (req, res) => {
    const userEmail = req.params.email;
    const loggedInUserEmail = req.user?.email;
    console.log('Requesting materials for:', userEmail);
    console.log('Logged in user:', loggedInUserEmail);

    if (userEmail !== loggedInUserEmail) {
        return res.status(403).send({ message: 'Unauthorized access.' });
    }

    try {
        const paidBookings = await bookingCollection.find({
            studentEmail: loggedInUserEmail,
            status: 'paid'
        }).toArray();
        console.log('Paid bookings found:', paidBookings.length);

        if (paidBookings.length === 0) {
            return res.status(404).send({ message: 'No paid bookings found for this user.' });
        }

        // Extract sessionIds from paid bookings
        const paidSessionIds = paidBookings.map(booking => booking.sessionId);
        console.log('Paid session IDs:', paidSessionIds);

        const materials = await materialCollection.find({
            studySessionId: { $in: paidSessionIds }
        }).toArray();
        console.log('Materials found:', materials.length);

        if (materials.length === 0) {
            return res.status(404).send({ message: 'No study materials found for your paid sessions.' });
        }

        res.send(materials);
    } catch (error) {
        console.error('Error fetching study materials:', error);
        res.status(500).send({ message: 'An error occurred while fetching study materials.' });
    }
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
