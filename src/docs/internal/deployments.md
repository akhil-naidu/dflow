# Deployments

## Railpack

- Port exposure Container port -> Host port
- Cloning Repository -> bare repository is created
- Creating a git-working directory in /home/dokku/${appName}-docker
- Using railpack to create docker-image `appName-docker` with environment
  variables
- Deploying the `appName-docker` docker-image
- Deleting the git-working directory `/home/dokku/${appName}-docker`
- Generating `SSL certificates`

## Dockerfile

- Port exposure Container port -> Host port
- Adding environment variables as build-args
- Cloning & Building repository with dokku
  `dokku git:sync --build ${appName} ${gitRepoUrl} ${branchName}`
- Generating `SSL certificates`

## Buildpacks

- Port exposure Container port -> Host port
- Cloning & Building repository with dokku
  `dokku git:sync --build ${appName} ${gitRepoUrl} ${branchName}`
- Generating `SSL certificates`

## Docker-image

- Port exposure Container port -> Host port
- Deploying using dokku `dokku git:from-image ${appName} ${imageName}`
- Generating `SSL certificates`
