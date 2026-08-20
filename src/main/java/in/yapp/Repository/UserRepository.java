package in.yapp.Repository;

import in.yapp.Entity.User;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID>
{

    boolean existsByUserName(String username);

    boolean existsByEmail(String email);


    @Query("SELECT u FROM users u WHERE u.userName = :identifier OR u.email = :identifier")
    Optional<User> findByUserNameOrEmail(@Param("identifier") String identifier);}
