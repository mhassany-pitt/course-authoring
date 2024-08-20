# put this file outside the course-authoring folder
# then use it to update the course-authoring and rebuild/run the docker containers
sudo rm -rf course-authoring
git clone https://github.com/mhassany-pitt/course-authoring.git
echo "HOST_IP=$(ip addr | grep 'inet ' | grep 'docker0' | awk '{print $2}' | cut -d'/' -f1)" > .env.host-ip
docker build --no-cache -t authoring-ui-build ./course-authoring/authoring-ui
docker run --rm -v ${PWD}/course-authoring/authoring-ui:/app authoring-ui-build
mkdir ./course-authoring/authoring-api/public/
sudo cp -rf ./course-authoring/authoring-ui/dist/authoring-ui/browser/** ./course-authoring/authoring-api/public/
sudo docker-compose --env-file .env.host-ip build --no-cache
sudo docker-compose --env-file .env.host-ip down
sudo docker-compose --env-file .env.host-ip up -d