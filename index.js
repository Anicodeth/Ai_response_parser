//Imports of required packages
const { response, json } = require('express');
const express = require('express');
const mongoose = require('mongoose');
const { Configuration, OpenAIApi } = require("openai");

//Api Configuration
const config = new Configuration({
    apiKey:  "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"
});

//Connection to mongo DB
mongoose.connect('mongodb://127.0.0.1:27017/test').then(()=> {
        console.log("Connected to Database")
    }).catch(err =>{
        console.log("An error has occured when tring to connect to database! ")
        console.log(err)
        return 0
});

//Database Schemas
const jobTitleSchema = new mongoose.Schema(
    {
        jobtitle:String,
        skillset:String,
        paragraph:String
    });

const userSchema = new mongoose.Schema(
        {

            fname:String,
            lname:String,
            jobtitle:String,
            phone:String,
            email:String

        });

//Collection connection
const jobTitle = mongoose.model('Jobtitle', jobTitleSchema);
const user = mongoose.model('user', userSchema);

//Express and OpenAi Configuration
const app = express();
const openai = new OpenAIApi(config);

//Json response and replay compatability
app.use(express.json())

//Session Trial
let sessionTrial = 5;

//Async function to return Ai response
const requestAi =async (prompt, sessionTrial, callback) => {
        const response = await openai.createCompletion(
        {
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 1,
            max_tokens: 2048} ).catch(err => {
                console.log("Error connecting");

            });

        console.log(sessionTrial);
        if(response){
        callback(response.data.choices[0].text);}
        else if(sessionTrial == 0){
            callback('["The Ai is too Crowded!"]');
        }
        else{
            console.log("Retrying...")
            requestAi(prompt,  sessionTrial - 1, callback);
        }
    }


//GET mapping to return skills of a cetain job
app.get('/api/skills/:job', (req, res) =>{

    //Passed Query
    const job = (req.params.job).toUpperCase();

    //Search if job already exists in database
    jobTitle.find({jobtitle:`${job}`, skillset : {$exists:true}}).then(data => {

        //Parse and return if it exists
        if (data[0] != undefined){
            answer = JSON.parse(JSON.stringify((data[0].skillset).split(',')));
            res.send(answer);
        }
        else{
            //Call Ai function
            requestAi(`Return a list of skills that a ${job} 
            has in the form of a javascript list
            like ["item1", "item2", "item3"], do not use single quotes.`,sessionTrial, 
            (answer)=> {
                    
                //Store data if returned from the Ai
                if (answer !== '["The Ai is too Crowded!"]'){
                    jobTitle.updateOne({job:`${job}`},{skillset:`${answer}`}).then((data)=>{
                        if(data.matchedCount == 0){
                            jobTitle.insertMany({jobtitle:`${job}`, skillset:`${answer}`})
                            }
                    });
            }

            //Return Ai answer
            answer = JSON.parse((answer));
            res.send(answer);

        });
        }
    });



});

//GET mapping to return short summaries of a cetain job
app.get('/api/paragraph/:job', (req, res) =>{
    const job = (req.params.job).toUpperCase();
    requestAi(`Write 4 different, short, atleast 4 sentence long Cv summaries for 
               a ${job} and return it in the form of a javascript list like 
               ["paragraph1","paragraph2","paragraph3", ...], do not use single quotes.`
               ,sessionTrial, (answer)=> {

                    if (answer !== '["The Ai is too Crowded!"]'){
                        jobTitle.updateOne({job:`${job}`},{paragraph:`${answer}`}).then((data)=>{
                            if(data.matchedCount == 0){
                                jobTitle.insertMany({jobtitle:`${job}`, paragraph:`${answer}`})
                                }
                        });
                    }

    answer = JSON.parse(answer);
    +
    res.send(answer);

    });

});


//Post mapping to store users details
app.post('/api/addperson',(req, res)=>{
    person= req.body;

    user.insertMany(
        {jobtitle:`${person.jobtitle}`, fname:`${person.fname}`,
        lname:`${person.lname}`, phone:`${person.phone}`,email:`${person.email}`
    })

    res.send(true);
});

//Main listening post
app.listen("3000", ()=>{
    console.log("Running on port 3000")
});