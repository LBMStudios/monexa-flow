using System;
using System.Net;
using System.IO;
using System.IO.Compression;
using System.Diagnostics;
using System.Threading;

class Program {
    static void Main() {
        Console.Title = "Monexa Flow Installer";
        Console.CursorVisible = false;
        
        // Colors & Header
        Console.ForegroundColor = ConsoleColor.DarkYellow;
        Console.WriteLine("==================================================");
        Console.ForegroundColor = ConsoleColor.Yellow;
        Console.WriteLine("        INSTALADOR MONEXA FLOW (WINDOWS)          ");
        Console.ForegroundColor = ConsoleColor.DarkYellow;
        Console.WriteLine("==================================================");
        Console.ResetColor();

        string url = "https://github.com/lbmstudios/monexa-flow/archive/refs/heads/main.zip";
        string tempZip = Path.Combine(Path.GetTempPath(), "monexa_temp.zip");
        string destFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments), "MonexaFlow");

        try {
            Console.WriteLine("\n[1/3] Descargando ultima version de GitHub...");
            
            AutoResetEvent waiter = new AutoResetEvent(false);
            
            using (WebClient wc = new WebClient()) {
                // Ensure TLS 1.2
                ServicePointManager.SecurityProtocol = (SecurityProtocolType)3072;
                
                wc.DownloadProgressChanged += (s, e) => {
                    DrawProgressBar(e.ProgressPercentage, 40);
                };
                
                wc.DownloadFileCompleted += (s, e) => {
                    waiter.Set();
                };
                
                wc.DownloadFileAsync(new Uri(url), tempZip);
                waiter.WaitOne();
            }
            
            Console.WriteLine("\n\n[2/3] Preparando archivos en 'Documentos'...");
            if (Directory.Exists(destFolder)) {
                try { Directory.Delete(destFolder, true); } catch {}
            }
            Directory.CreateDirectory(destFolder);
            ZipFile.ExtractToDirectory(tempZip, destFolder);

            Console.WriteLine("[3/3] Abriendo configurador de Chrome...");
            Process.Start("chrome.exe", "chrome://extensions/");

            Console.ForegroundColor = ConsoleColor.Yellow;
            Console.WriteLine("\n==================================================");
            Console.WriteLine("          ¡CASI LISTO! SOLO 2 CLICS MAS:");
            Console.WriteLine("==================================================");
            Console.ResetColor();
            Console.WriteLine("1. Activa el 'Modo desarrollador' (arriba a la derecha).");
            Console.WriteLine("2. Haz clic en 'Cargar extension sin empaquetar'.");
            Console.WriteLine("3. Busca y selecciona esta carpeta:");
            Console.ForegroundColor = ConsoleColor.Cyan;
            Console.WriteLine("   " + Path.Combine(destFolder, "monexa-flow-main", "extension"));
            Console.ResetColor();
            Console.WriteLine("==================================================");

        } catch (Exception ex) {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine("\nError inesperado: " + ex.Message);
        }

        Console.CursorVisible = true;
        Console.WriteLine("\nPresiona cualquier tecla para salir...");
        Console.ReadKey();
    }

    static void DrawProgressBar(int percentage, int width) {
        Console.CursorLeft = 0;
        Console.Write("[");
        int filledCount = (percentage * width) / 100;
        
        Console.ForegroundColor = ConsoleColor.Yellow;
        for (int i = 0; i < filledCount; i++) Console.Write("#");
        Console.ResetColor();
        
        for (int i = 0; i < width - filledCount; i++) Console.Write("-");
        Console.Write("] " + percentage + "% ");
    }
}
