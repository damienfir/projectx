package bigpiq.shared


trait Api {
  def getUser(id: Long): User
}
