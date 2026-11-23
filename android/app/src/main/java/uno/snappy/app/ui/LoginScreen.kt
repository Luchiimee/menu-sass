package uno.snappy.app.ui

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Mail
import androidx.compose.material.icons.outlined.Visibility
import androidx.compose.material.icons.outlined.VisibilityOff
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.OutlinedTextFieldDefaults
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalUriHandler
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import uno.snappy.app.R

private val Line = Color(0xFFE5E7EB)
private val Label = Color(0xFF9CA3AF)
private val Body = Color(0xFF6B7280)

// Mismo login que la web (snappy.uno/login): logo, "Continuar con Google", y email + contraseña.
@Composable
fun LoginScreen(state: UiState, onSignIn: (String, String) -> Unit, onGoogle: () -> Unit) {
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showPassword by remember { mutableStateOf(false) }
    val uri = LocalUriHandler.current
    val fieldShape = RoundedCornerShape(12.dp)
    val fieldColors = OutlinedTextFieldDefaults.colors(
        focusedBorderColor = Ink, unfocusedBorderColor = Line,
        focusedContainerColor = Color.White, unfocusedContainerColor = Color.White,
        cursorColor = Ink,
    )

    Box(Modifier.fillMaxSize().background(Color.White)) {
        Column(
            Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 28.dp, vertical = 24.dp),
            verticalArrangement = Arrangement.Center,
            horizontalAlignment = Alignment.CenterHorizontally,
        ) {
            Image(painter = painterResource(R.drawable.logo_snappy), contentDescription = "Snappy", modifier = Modifier.width(200.dp))
            Spacer(Modifier.height(8.dp))
            Text("Bienvenido", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = Ink)
            Spacer(Modifier.height(6.dp))
            Text("Ingresa tus datos.", color = Body, fontSize = 15.sp)
            Spacer(Modifier.height(24.dp))

            OutlinedButton(
                onClick = onGoogle,
                modifier = Modifier.fillMaxWidth().height(50.dp),
                shape = fieldShape,
                border = BorderStroke(1.dp, Color(0xFFD1D5DB)),
                colors = ButtonDefaults.outlinedButtonColors(containerColor = Color.White, contentColor = Color(0xFF374151)),
            ) {
                Image(painter = painterResource(R.drawable.ic_google), contentDescription = null, modifier = Modifier.size(20.dp))
                Spacer(Modifier.width(12.dp))
                Text("Continuar con Google", fontWeight = FontWeight.Bold, fontSize = 15.sp)
            }

            Spacer(Modifier.height(22.dp))
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                HorizontalDivider(Modifier.weight(1f), color = Line)
                Text("  O con email  ", color = Body, fontSize = 14.sp)
                HorizontalDivider(Modifier.weight(1f), color = Line)
            }
            Spacer(Modifier.height(22.dp))

            FieldLabel("EMAIL")
            OutlinedTextField(
                value = email, onValueChange = { email = it },
                placeholder = { Text("tu@email.com", color = Label) },
                leadingIcon = { Icon(Icons.Outlined.Mail, null, tint = Label) },
                singleLine = true, shape = fieldShape, colors = fieldColors,
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(16.dp))
            FieldLabel("CONTRASEÑA")
            OutlinedTextField(
                value = password, onValueChange = { password = it },
                placeholder = { Text("••••••••", color = Label) },
                leadingIcon = { Icon(Icons.Outlined.Lock, null, tint = Label) },
                trailingIcon = {
                    IconButton(onClick = { showPassword = !showPassword }) {
                        Icon(if (showPassword) Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility, "Mostrar contraseña", tint = Label)
                    }
                },
                singleLine = true, shape = fieldShape, colors = fieldColors,
                visualTransformation = if (showPassword) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
            Text(
                "¿OLVIDASTE TU CONTRASEÑA?", color = Label, fontSize = 11.sp, fontWeight = FontWeight.Bold,
                modifier = Modifier.align(Alignment.End).padding(top = 10.dp).clickable { uri.openUri("https://snappy.uno/login") },
            )

            state.loginError?.let {
                Spacer(Modifier.height(12.dp))
                Text(it, color = Alert, fontSize = 13.sp, fontWeight = FontWeight.Bold, textAlign = TextAlign.Center)
            }
            Spacer(Modifier.height(20.dp))
            Button(
                onClick = { onSignIn(email, password) },
                enabled = !state.loggingIn,
                shape = fieldShape,
                colors = ButtonDefaults.buttonColors(containerColor = Color.Black, contentColor = Color.White),
                modifier = Modifier.fillMaxWidth().height(50.dp),
            ) {
                if (state.loggingIn) CircularProgressIndicator(Modifier.size(22.dp), strokeWidth = 2.dp, color = Color.White)
                else {
                    Text("Iniciar Sesión", fontWeight = FontWeight.Bold, fontSize = 15.sp)
                    Spacer(Modifier.width(8.dp))
                    Icon(Icons.AutoMirrored.Outlined.ArrowForward, null, modifier = Modifier.size(18.dp))
                }
            }

            Spacer(Modifier.height(22.dp))
            Row(Modifier.clickable { uri.openUri("https://snappy.uno/register") }) {
                Text("¿Aún no tienes cuenta? ", color = Body, fontSize = 14.sp)
                Text("Regístrate gratis", color = Ink, fontSize = 14.sp, fontWeight = FontWeight.Bold)
            }
        }
    }
}

@Composable
private fun FieldLabel(text: String) {
    Text(
        text, color = Label, fontSize = 10.sp, fontWeight = FontWeight.Black,
        modifier = Modifier.fillMaxWidth().padding(bottom = 4.dp),
    )
}
