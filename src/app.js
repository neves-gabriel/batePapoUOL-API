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

app.post('/participants', async(req, res) => {
    let validateName = nameSchema.validate(req.body);
    if ( validateName.error ) {
        res.status(422).send('Nome não pode ser vazio');
        return
    };
    const name = stripHtml(req.body.name, {trimOnlySpaces: true}).result;
    try {
        await mongoClient.connect();
        const dbBatePapoUOL = mongoClient.db('batePapoUOL_API');
        let validateNameAvailability = await dbBatePapoUOL.collection('participants').find(req.body).toArray();
        if ( validateNameAvailability.length > 0 ) {
            res.status(409).send('Esse nome já está sendo utilizado');
            mongoClient.close();
        }
        else {
            await dbBatePapoUOL.collection('participants').insertOne({ name: name, lastStatus: Date.now() });
            await dbBatePapoUOL.collection('messages').insertOne({
                from: name, 
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

app.get('/participants', async(req, res) => {
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

app.post('/messages', async (req, res) => {
    const user = stripHtml(req.headers.user, {trimOnlySpaces: true}).result;
    await mongoClient.connect();
    const dbBatePapoUOL = mongoClient.db('batePapoUOL_API');
    let validateUser = await dbBatePapoUOL.collection('participants').find({name: user}).toArray();
    if (validateUser.length === 0) {
        res.status(422).send('Usuário não existe na lista de participantes');
        mongoClient.close();
        return
    }
    req.body.to = stripHtml(req.body.to, {trimOnlySpaces: true}).result;
    req.body.text = stripHtml(req.body.text, {trimOnlySpaces: true}).result;
    req.body.type = stripHtml(req.body.type, {trimOnlySpaces: true}).result;
    const validateMessage = messageSchema.validate(req.body);
    if (validateMessage.error) {
        res.status(422).send('Nem a mensagem nem o destinatário podem ser vazios');
        mongoClient.close();
        return
    }
    try {
        await dbBatePapoUOL.collection('messages').insertOne({ 
            from: user, 
            ...req.body, 
            time: dayjs().locale('pt-br').format('HH:mm:ss') 
        });
        res.sendStatus(201);
        mongoClient.close();
    } catch(error) {
        res.status(500).send('A culpa foi do estagiário');
        mongoClient.close();
    }
});

app.get('/messages', async (req, res) => {
    const user = req.headers.user;
    const limit = parseInt(req.query.limit);
    await mongoClient.connect();
    const dbBatePapoUOL = mongoClient.db('batePapoUOL_API');
    try {
        let messages = await dbBatePapoUOL.collection('messages').find({ 
            $or: [ {from: user}, {to: user}, {to: 'Todos'}, { type: 'message' } ] 
        }).toArray();
        if( messages < limit || isNaN(limit) || limit < 0) {
            res.status(200).send(messages);
        } else {
            const limitedMessages = messages.slice(-limit)
            res.status(200).send(limitedMessages)
        }
        mongoClient.close();
    } catch(error) {
        res.status(500).send('A culpa foi do estagiário');
        mongoClient.close();
    }
});

app.post('/status', async (req, res) => {
    try {
        const user = stripHtml(req.headers.user).result;
        await mongoClient.connect();
        const dbBatePapoUOL = mongoClient.db('batePapoUOL_API');
        const validateUser = await dbBatePapoUOL.collection('participants').find({ name: user }).toArray();
        if (validateUser.length === 0) {
            res.sendStatus(404);
            mongoClient.close();
            return
        }
        await dbBatePapoUOL.collection('participants').updateOne({ name: user }, { $set: {lastStatus: Date.now()} });
        res.sendStatus(200);
        mongoClient.close();
    } catch(error) {
        res.status(500).send('A culpa foi do estagiário');
        mongoClient.close();
    }
});

app.listen(5000, () => {
    console.log("Rodando em http://localhost:5000");
});