variable "network_name" {
  type = string
}

resource "docker_network" "ecommerce" {
  name   = var.network_name
  driver = "bridge"
}

output "network_id" {
  value = docker_network.ecommerce.id
}

output "network_name" {
  value = docker_network.ecommerce.name
}
