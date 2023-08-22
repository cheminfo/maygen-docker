# maygen-docker

Webservice allowing to convert between molecule formats using maygen

## Installation

This project uses docker. After cloning the project you should do:

`cp docker-compose.example.yml docker-compose.yml`

You can either use a released docker image or build the head. Please change `docker-compose.yml` accordingly.

`docker-compose up --build -d`

This will start a webserver on port 30822

For the browser you can test for example:

`http://localhost:30822/`

## Local developmwent

For local development you may have to edit the `docker/.env` in order to set the location of BABEL.

```
cd docker
docker build . -t maygen
docker run -it maygen bash
```

## License

[MIT](./LICENSE)

maygen is subject to its own license.

```

```
