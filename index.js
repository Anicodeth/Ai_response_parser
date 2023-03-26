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

//Collection connection
const jobTitle = mongoose.model('Jobtitle', jobTitleSchema);

//Express and OpenAi Configuration
const app = express();
const openai = new OpenAIApi(config);

//Json response and replay compatability
app.use(express.json())

//Async function to return Ai response
const requestAi =async (prompt, callback) => {
        const response = await openai.createCompletion(
        {
            model: "text-davinci-003",
            prompt: prompt,
            temperature: 1,
            max_tokens: 2048} ).catch(err => {
                console.log("Error connecting");
            });


        if(response){
        callback(response.data.choices[0].text);}
        else{
            console.log("Retrying...")
            requestAi(prompt, callback);
        }
    }


//GET mapping to return skills of a cetain job
app.get('/api/skills/:job', (req, res) =>{
    const job = (req.params.job).toUpperCase();

    jobTitle.find({jobtitle:`${job}`, skillset : {$exists:true}}).then(data => {

        if (data[0] != undefined){
            answer = JSON.parse(JSON.stringify((data[0].skillset).split(',')));
            res.send(answer);
        }
        else{
            requestAi(`Return a list of skills that a ${job} 
            has in the form of a javascript list
            like ["item1", "item2", "item3"], do not use single qoutes`, 
            (answer)=> {

            jobTitle.updateOne({job:`${job}`},{skillset:`${answer}`}).then((data)=>{
                if(data.matchedCount == 0){
                    jobTitle.insertMany({jobtitle:`${job}`, skillset:`${answer}`})
                    }
            });
            answer = JSON.parse((answer));
            res.send(answer);

        });
        }
    });



});

//GET mapping to return short summaries of a cetain job
app.get('/api/paragraph/:job', (req, res) =>{

    requestAi(`Write 4 different, short, atleast 4 sentence long Cv summaries for 
               a ${req.params.job} and return it in the form of a javascript list like 
               ["paragraph1","paragraph2","paragraph3", ...]`, 
                (answer)=> {

    answer = JSON.parse(answer);
    res.send(answer);

    });

});

app.post('/api/addperson',(req, res)=>{
let rev = req.body.name

res.send(rev);
})

app.listen("3000", ()=>{
    console.log("Running on port 3000")
});