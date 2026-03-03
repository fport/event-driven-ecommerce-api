variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "dev"
}

variable "network_name" {
  description = "Docker network name"
  type        = string
  default     = "ecommerce-network"
}

variable "image_tag" {
  description = "Docker image tag"
  type        = string
  default     = "latest"
}
