module "vpc" {
  source = "git::https://github.com/techwmarcus/aws-modules.git//vpc"

  pub_subnet_name = "public-subnet"
  prv_subnet_name = "private-subnet"
  vpc_name        = "test"
}

module "kube" {
  source = "git::https://github.com/techwmarcus/aws-modules.git//kube"

  cluster_name       = "secops-cluster"
  desired_capacity   = 2
  max_capacity       = 3
  min_capacity       = 1
  private_subnet_ids = module.vpc.private_subnet_ids

}

resource "aws_eks_access_entry" "admin" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:user/admin"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "admin" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:user/admin"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin]
}

resource "aws_eks_access_entry" "admin1" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:role/git-ops"
  type          = "STANDARD"
}

resource "aws_eks_access_policy_association" "admin1" {
  cluster_name  = module.kube.cluster_name
  principal_arn = "arn:aws:iam::716563790644:role/git-ops"

  policy_arn = "arn:aws:eks::aws:cluster-access-policy/AmazonEKSClusterAdminPolicy"

  access_scope {
    type = "cluster"
  }

  depends_on = [aws_eks_access_entry.admin]
}