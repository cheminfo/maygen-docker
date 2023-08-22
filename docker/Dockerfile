FROM node:20

EXPOSE 30822

RUN apt-get install -y curl
RUN curl -sL https://deb.nodesource.com/setup_12.x | bash -
RUN apt-get install -y openjdk-17-jdk

RUN mkdir /node
COPY package.json /node/
WORKDIR /node
# We install before copying the source code that is changing during development
RUN npm i 

COPY MAYGEN* /node/
COPY src /node/src

CMD npm start

#CMD bash