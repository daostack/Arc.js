while :
do
  STATUS=$(curl -I http://localhost:8020 2>/dev/null | head -n 1 | cut -d$' ' -f2)

  if [[ "$STATUS" == *"405"* ]]; then
    echo "Subgraph available!"
    break
  else
    echo "Waiting on Subgraph..."
    docker-compose logs graph-node
    docker-compose logs postgres
    sleep 2
  fi
done
