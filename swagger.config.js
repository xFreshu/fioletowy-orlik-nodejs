import swaggerAutogen from 'swagger-autogen';

const doc = {
    info: {
        title: 'Twitch Streamer API',
        description: 'An API to fetch and display Twitch streamer data.',
    },
    host: 'localhost:3000', // The host where the API is running
    schemes: ['http'],
};

const outputFile = './swagger-output.json';
// Point to the main app file where routes are mounted
const endpointsFiles = ['./src/index.ts'];

swaggerAutogen()(outputFile, endpointsFiles, doc).then(() => {
    console.log('Swagger documentation has been generated with full paths.');
});
