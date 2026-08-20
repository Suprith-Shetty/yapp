package in.yapp.DTO;


import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Data;


@Data
public class UserRegisterRequestDTO
{
    @NotBlank(message = "Username is required")
    @Size(min = 3, max = 30, message = "Username must be between 3 and 30 characters")
    private String username;

    @NotBlank(message = "Email is required")
//    @Email(message = "Enter a valid email")
    @Pattern(
            regexp = "^[A-Za-z0-9._%+-]+@gmail\\.com$",
            message = "Only Gmail addresses are allowed"
    )
    private String email;

    @NotBlank(message = "Password is required")
    @Size(min = 8,message = "Password must be atleast 8 characters")
    private String password;


}
