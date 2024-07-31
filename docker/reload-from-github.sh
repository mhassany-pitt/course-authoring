# put this file outside the course-authoring folder
# then use it to update the course-authoring and rebuild/run the docker containers
sudo rm -rf course-authoring
git clone https://github.com/mhassany-pitt/course-authoring.git
docker build --no-cache -t authoring-ui-build ./course-authoring/authoring-ui
docker run --rm -v ${PWD}/course-authoring/authoring-ui:/app authoring-ui-build
mkdir ./course-authoring/authoring-api/public/
sudo cp -rf ./course-authoring/authoring-ui/dist/authoring-ui/browser/** ./course-authoring/authoring-api/public/
sudo docker-compose build --no-cache
sudo docker-compose down
sudo docker-compose up -d
