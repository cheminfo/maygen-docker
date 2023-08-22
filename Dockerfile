FROM node:20

EXPOSE 30822

RUN apt-get install -y openjdk-11

RUN mkdir /node
COPY src /node/src
COPY package.json /node/

WORKDIR /node
RUN npm i 

CMD npm start