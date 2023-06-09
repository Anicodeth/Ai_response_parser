//Imports of required packages

const express = require('express');
const mongoose = require('mongoose');
const { Configuration, OpenAIApi } = require("openai");
const cors = require('cors');
//Api Configuration
const config = new Configuration({
    apiKey:  "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"
});

//Connection to mongo DB
mongoose.connect('mongodb+srv://afmtoday:OlxwPFCF0rLMnA3e@cluster0.edrrjyh.mongodb.net/awaqi?retryWrites=true&w=majority').then(()=> {
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
app.use(express.json());
app.use(cors());
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

    

async function findCommonSkills() {

  data = await jobTitle.find({jobtitle:'Common', skillset:{$exists:true}})

            answer = JSON.parse(JSON.stringify((data[0].skillset).split(',')));
                const min = 0;
                const max = answer.length -5;
                const sliceStart = Math.floor(Math.random() * (max - min + 1)) + min;
                    if (sliceStart + 20 < max){
                        answer = answer.slice(sliceStart, sliceStart + 20 )
                    }
                    else {
                        answer = answer.slice(sliceStart, answer.length-1);
                    }
            return answer
 
        }

  
    


async function findCommonParagraphs() {


    data = await jobTitle.find({jobtitle:'Common', paragraph:{$exists:true}})

    answer = JSON.parse(JSON.stringify((data[0].paragraph).split('|,')));
        const min = 0;
        const max = answer.length - 5;
        const sliceStart = Math.floor(Math.random() * (max - min + 1)) + min;
            if (sliceStart + 3 < max){
                answer = answer.slice(sliceStart, sliceStart + 3 )
            }
            else {
                answer = answer.slice(sliceStart, answer.length-1);
            }
    return answer
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
            like ["item1", "item2", "item3"], do not use single quotes for the items.`,sessionTrial, 
            async (answer)=> {
                    
                //Store data if returned from the Ai
                if (answer !== '["The Ai is too Crowded!"]'){
                    jobTitle.updateOne({job:`${job}`},{skillset:`${answer}`}).then((data)=>{
                        if(data.matchedCount == 0){
                            jobTitle.insertMany({jobtitle:`${job}`, skillset:`${answer}`})
                            }

                    });
            }
            else {
                answer = await findCommonSkills();
                res.send(answer);
            }

            //Return Ai answer
            try{
            answer = JSON.parse((answer));
            }
            catch(err) {
                answer = await findCommonSkills();
                try{res.send(answer);}
                catch(e){}
            };



            try{res.send(answer);}
                catch(err){}
        });
        }
    });



});

//GET mapping to return short summaries of a cetain job
app.get('/api/paragraph/:job', (req, res) =>{
    const job = (req.params.job).toUpperCase();
    jobTitle.find({jobtitle:`${job}`, paragraph : {$exists:true}}).then(data => {

        //Parse and return if it exists
        if (data[0] != undefined){
            answer = JSON.parse(JSON.stringify((data[0].paragraph).split('|,')));
            res.send(answer);
        }

else{

    requestAi(`Write 3 different, short, atleast 4 sentence long Cv summaries for 
               a ${job} and return it in the form of a javascript list like 
               ["paragraph1|","paragraph2|","paragraph3|", ...], do not use 
               single quotes for the paragraphs, always use double quotes, 
               put '|' at the end of every paragraph inside the quotes.`

               ,sessionTrial, async (answer)=> {

                    if (answer !== '["The Ai is too Crowded!"]'){
                        jobTitle.updateOne({job:`${job}`},{paragraph:`${answer}`}).then((data)=>{
                            if(data.matchedCount == 0){
                                jobTitle.insertMany({jobtitle:`${job}`, paragraph:`${answer}`})
                                }
                        });
                      }
                    else {
                        answer = await findCommonParagraphs();
                        res.send(answer);
                    }
     try{
        answer = JSON.parse((answer)) }      
     catch(err) {
        console.log(err);
        try{
        res.send( await findCommonParagraphs());
        }catch(e){}}

    try{
    res.send(answer);}
    catch(err){}

     });
}
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
const PORT = process.env.PORT || 4000;
app.listen(`${PORT}`, ()=>{
    console.log(`Running on port ${PORT}`)
});

module.exports = app;