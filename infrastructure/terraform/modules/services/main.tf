# Infrastructure services managed by Terraform (Docker provider)

resource "docker_image" "postgres" {
  name = "postgres:17-alpine"
}

resource "docker_image" "redis" {
  name = "redis:7-alpine"
}

resource "docker_image" "mongo" {
  name = "mongo:7"
}

resource "docker_image" "rabbitmq" {
  name = "rabbitmq:3-management-alpine"
}

resource "docker_image" "elasticsearch" {
  name = "docker.elastic.co/elasticsearch/elasticsearch:8.17.0"
}

# PostgreSQL
resource "docker_container" "postgres" {
  name  = "ecommerce-postgres-${var.environment}"
  image = docker_image.postgres.image_id

  ports {
    internal = 5432
    external = 5432
  }

  env = [
    "POSTGRES_USER=postgres",
    "POSTGRES_PASSWORD=postgres",
    "POSTGRES_DB=orders",
  ]

  networks_advanced {
    name = var.network_name
  }

  volumes {
    volume_name    = "postgres_data_${var.environment}"
    container_path = "/var/lib/postgresql/data"
  }
}

# Redis
resource "docker_container" "redis" {
  name  = "ecommerce-redis-${var.environment}"
  image = docker_image.redis.image_id

  ports {
    internal = 6379
    external = 6379
  }

  networks_advanced {
    name = var.network_name
  }
}

# MongoDB
resource "docker_container" "mongo" {
  name  = "ecommerce-mongo-${var.environment}"
  image = docker_image.mongo.image_id

  ports {
    internal = 27017
    external = 27017
  }

  networks_advanced {
    name = var.network_name
  }
}

# RabbitMQ
resource "docker_container" "rabbitmq" {
  name  = "ecommerce-rabbitmq-${var.environment}"
  image = docker_image.rabbitmq.image_id

  ports {
    internal = 5672
    external = 5672
  }

  ports {
    internal = 15672
    external = 15672
  }

  env = [
    "RABBITMQ_DEFAULT_USER=guest",
    "RABBITMQ_DEFAULT_PASS=guest",
  ]

  networks_advanced {
    name = var.network_name
  }
}

# ElasticSearch
resource "docker_container" "elasticsearch" {
  name  = "ecommerce-elasticsearch-${var.environment}"
  image = docker_image.elasticsearch.image_id

  ports {
    internal = 9200
    external = 9200
  }

  env = [
    "discovery.type=single-node",
    "xpack.security.enabled=false",
    "ES_JAVA_OPTS=-Xms512m -Xmx512m",
  ]

  networks_advanced {
    name = var.network_name
  }

  volumes {
    volume_name    = "es_data_${var.environment}"
    container_path = "/usr/share/elasticsearch/data"
  }
}
