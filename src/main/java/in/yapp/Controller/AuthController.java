package in.yapp.Controller;


import in.yapp.DTO.LoginRequestDTO;
import in.yapp.DTO.LoginResponseDTO;
import in.yapp.DTO.UserRegisterRequestDTO;
import in.yapp.DTO.UserRegisterResponseDTO;
import in.yapp.Service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController
{
    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserRegisterResponseDTO> register(@Valid @RequestBody UserRegisterRequestDTO userRegisterRequestDTO)
    {
        return ResponseEntity.ok(authService.register(userRegisterRequestDTO));
    }


    @PostMapping("/login")
    public  ResponseEntity<LoginResponseDTO>  login(@Valid @RequestBody LoginRequestDTO loginRequestDTO)
    {

        return ResponseEntity.ok(authService.login(loginRequestDTO));
    }




    @GetMapping("/hello")
    public String greet()
    {
        return "Helloooo";
    }

}
