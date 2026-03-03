output "network_name" {
  value = module.network.network_name
}

output "gateway_url" {
  value = "http://localhost:3000"
}

output "rabbitmq_ui" {
  value = "http://localhost:15672"
}

output "kibana_url" {
  value = "http://localhost:5601"
}
