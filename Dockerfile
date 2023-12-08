# Fetching the minified node image on apline linux
FROM node:slim as base

# Declaring env
# ENV NODE_ENV development



# Copying all the files in our project
COPY . .

# Installing dependencies
RUN npm install

# build dist
RUN npm run build

# start production image
FROM node:slim

# Setting up the work directory
WORKDIR /express-docker

# Copy node modules and build directory
COPY --from=base ./node_modules ./node_modules
COPY --from=base /dist ./dist

# Starting our application
# CMD [ "/bin/bash" ]
CMD [ "node", "/express-docker/dist/index.js" ]

# Exposing server port
EXPOSE 8000