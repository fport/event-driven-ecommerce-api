terraform {
  required_version = ">= 1.0"

  required_providers {
    docker = {
      source  = "kreuzwerker/docker"
      version = "~> 3.0"
    }
  }
}

provider "docker" {
  host = "unix:///var/run/docker.sock"
}

module "network" {
  source = "./modules/network"

  network_name = var.network_name
}

module "services" {
  source = "./modules/services"

  network_id   = module.network.network_id
  network_name = var.network_name
  environment  = var.environment
  image_tag    = var.image_tag
}
