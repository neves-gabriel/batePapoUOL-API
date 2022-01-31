import express, { json } from "express";
import cors from 'cors';
import joi from 'joi';
import dotenv from 'dotenv';
import dayjs from 'dayjs';
import {MongoClient}from 'mongodb';
import {stripHtml} from 'string-strip-html';

dotenv.config();

const app = express()

app.use(cors())
app.use(express.json())

const nameSchema = joi.object({
    name: joi.string().required()
});
const messageSchema = joi.object({
    to: joi.string().required(),
    text: joi.string().required(),
    type: joi.alternatives().valid('message', 'private_message').required()
});

const mongoClient = new MongoClient('mongodb://localhost:27017');

app.post( '/participants', async( req, res ) => {
    let validateName = nameSchema.validate(req.body);
    if ( validateName.error ) {
        res.status(422).send('Nome não pode ser vazio');
        return
    };
    req.body.name = stripHtml(req.body.name, {trimOnlySpaces: true}).result;
    try {
        await mongoClient.connect();
        const dbBatePapoUOL = mongoClient.db('batePapoUOL_API');
        let validateNameAvailability = await dbBatePapoUOL.collection('participants').find(req.body).toArray();
        if ( validateNameAvailability.length > 0 ) {
            res.status(409).send('Esse nome já está sendo utilizado');
            mongoClient.close();
        }
        else {
            await dbBatePapoUOL.collection('participants').insertOne( { name: req.body.name, lastStatus: Date.now() } );
            await dbBatePapoUOL.collection('messages').insertOne({
                from: req.body.name, 
                to: 'Todos', 
                text: 'entra na sala...', 
                type: 'status', 
                time: dayjs().locale('pt-br').format('HH:mm:ss') 
            });
            res.sendStatus(201);
            mongoClient.close();
        }
    } catch (error) {
        res.status(500).send('A culpa foi do estagiário');
        mongoClient.close();
    }
});

app.get( '/participants', async( req, res ) => {
    try {
        await mongoClient.connect();
        const dbBatePapoUOL = mongoClient.db('batePapoUOL_API');
        const participants = await dbBatePapoUOL.collection('participants').find({}).toArray();
        res.status(200).send(participants);
        mongoClient.close();
    } catch (error) {
        res.status(500).send('A culpa foi do estagiário');
        mongoClient.close();
    }
});

app.listen(5000, () => {
    console.log("Rodando em http://localhost:5000");
});