package in.yapp.Repository;

import in.yapp.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID>
{

    boolean existsByUserName(String username);
    boolean existsByEmail(String email);

}
