package in.yapp.DTO;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class LoginRequestDTO
{
    @NotBlank(message = "Username is required")
    private String username;

    @NotBlank
    private String password;

}
